package webhook_service

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
	"sync"

	producer_interfaces "github.com/webapp-wago/webapp-wago/pkg/events/interfaces"
	event_types "github.com/webapp-wago/webapp-wago/pkg/internal/event_types"
	logger_wrapper "github.com/webapp-wago/webapp-wago/pkg/logger"
	webhook_model "github.com/webapp-wago/webapp-wago/pkg/webhook/model"
	webhook_repository "github.com/webapp-wago/webapp-wago/pkg/webhook/repository"
)

// WebhookService maneja N webhooks por instancia con filtros inline.
// Mantiene cache in-memory por instancia (anti-N+1: cada evento de
// WhatsApp dispara Dispatch sin tocar DB). Cache se invalida en cada
// Create/Update/Delete vía Reload.
type WebhookService interface {
	// CRUD (instance-scoped).
	List(instanceID string) ([]webhook_model.Webhook, error)
	Get(instanceID, id string) (*webhook_model.Webhook, error)
	Create(instanceID string, in *WebhookInput) (*webhook_model.Webhook, error)
	Update(instanceID, id string, in *WebhookInput) (*webhook_model.Webhook, error)
	Delete(instanceID, id string) error
	DeleteByInstance(instanceID string) error

	// Dispatch evalúa todos los webhooks cacheados de la instancia y
	// POSTea (fire-and-forget) a cada uno que matchee el filtro.
	Dispatch(instanceID, eventType, chatJID, senderJID string, jsonData []byte)

	// ExtractChatSender saca chatJID y senderJID del payload parseado
	// del evento (best-effort, sobre los shapes conocidos de whatsmeow).
	ExtractChatSender(data map[string]interface{}) (string, string)

	// Reload fuerza recarga del cache para una instancia (testing).
	Reload(instanceID string) error
}

// WebhookInput es el body que aceptan Create/Update — separado del
// model para no exponer ID/CreatedAt en el contrato de entrada.
type WebhookInput struct {
	URL      string   `json:"url"`
	Enabled  *bool    `json:"enabled,omitempty"`
	Events   []string `json:"events,omitempty"`
	ChatType string   `json:"chatType,omitempty"`
	ChatIDs  []string `json:"chatIds,omitempty"`
	Senders  []string `json:"senders,omitempty"`
}

type webhookService struct {
	repo     webhook_repository.WebhookRepository
	producer producer_interfaces.Producer
	logger   *logger_wrapper.LoggerManager

	mu    sync.RWMutex
	cache map[string][]webhook_model.Webhook
}

func NewWebhookService(
	repo webhook_repository.WebhookRepository,
	producer producer_interfaces.Producer,
	logger *logger_wrapper.LoggerManager,
) WebhookService {
	return &webhookService{
		repo:     repo,
		producer: producer,
		logger:   logger,
		cache:    map[string][]webhook_model.Webhook{},
	}
}

// validate normaliza y valida un input. Llamada en Create/Update.
func (s *webhookService) validate(in *WebhookInput) error {
	if in == nil {
		return errors.New("body vacío")
	}
	if strings.TrimSpace(in.URL) == "" {
		return errors.New("url es obligatoria")
	}
	u, err := url.Parse(in.URL)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return errors.New("url inválida: debe ser http(s)://host/...")
	}
	if in.ChatType != "" && !webhook_model.ValidChatType(in.ChatType) {
		return fmt.Errorf("chatType inválido: %q (use any|group|individual)", in.ChatType)
	}
	for _, ev := range in.Events {
		if ev == "" {
			continue
		}
		if !event_types.IsEventType(ev) {
			return fmt.Errorf("event type inválido: %q", ev)
		}
	}
	return nil
}

func toModel(instanceID string, in *WebhookInput) *webhook_model.Webhook {
	enabled := true
	if in.Enabled != nil {
		enabled = *in.Enabled
	}
	chatType := in.ChatType
	if chatType == "" {
		chatType = webhook_model.ChatTypeAny
	}
	return &webhook_model.Webhook{
		InstanceID: instanceID,
		URL:        strings.TrimSpace(in.URL),
		Enabled:    enabled,
		Events:     in.Events,
		ChatType:   chatType,
		ChatIDs:    in.ChatIDs,
		Senders:    in.Senders,
	}
}

func (s *webhookService) List(instanceID string) ([]webhook_model.Webhook, error) {
	return s.repo.List(instanceID)
}

func (s *webhookService) Get(instanceID, id string) (*webhook_model.Webhook, error) {
	w, err := s.repo.Get(id)
	if err != nil {
		return nil, err
	}
	if w.InstanceID != instanceID {
		return nil, errors.New("webhook no encontrado")
	}
	return w, nil
}

func (s *webhookService) Create(instanceID string, in *WebhookInput) (*webhook_model.Webhook, error) {
	if err := s.validate(in); err != nil {
		return nil, err
	}
	n, err := s.repo.CountByInstance(instanceID)
	if err != nil {
		return nil, err
	}
	if n >= int64(webhook_model.MaxWebhooksPerInstance) {
		return nil, fmt.Errorf("máximo %d webhooks por instancia alcanzado", webhook_model.MaxWebhooksPerInstance)
	}
	w := toModel(instanceID, in)
	if err := s.repo.Create(w); err != nil {
		return nil, err
	}
	_ = s.Reload(instanceID)
	return w, nil
}

func (s *webhookService) Update(instanceID, id string, in *WebhookInput) (*webhook_model.Webhook, error) {
	cur, err := s.Get(instanceID, id)
	if err != nil {
		return nil, err
	}
	if err := s.validate(in); err != nil {
		return nil, err
	}
	w := toModel(instanceID, in)
	w.ID = cur.ID
	w.CreatedAt = cur.CreatedAt
	if err := s.repo.Update(w); err != nil {
		return nil, err
	}
	_ = s.Reload(instanceID)
	return w, nil
}

func (s *webhookService) Delete(instanceID, id string) error {
	if err := s.repo.Delete(id, instanceID); err != nil {
		return err
	}
	_ = s.Reload(instanceID)
	return nil
}

func (s *webhookService) DeleteByInstance(instanceID string) error {
	if err := s.repo.DeleteByInstance(instanceID); err != nil {
		return err
	}
	_ = s.Reload(instanceID)
	return nil
}

func (s *webhookService) Reload(instanceID string) error {
	list, err := s.repo.List(instanceID)
	if err != nil {
		return err
	}
	s.mu.Lock()
	s.cache[instanceID] = list
	s.mu.Unlock()
	return nil
}

func (s *webhookService) getCached(instanceID string) []webhook_model.Webhook {
	s.mu.RLock()
	v, ok := s.cache[instanceID]
	s.mu.RUnlock()
	if ok {
		return v
	}
	// Lazy load primera vez.
	_ = s.Reload(instanceID)
	s.mu.RLock()
	v = s.cache[instanceID]
	s.mu.RUnlock()
	return v
}

// MatchesFilter es pura: dado un webhook y los datos del evento, dice
// si dispara o no. Semántica:
//   - events vacío o contiene "ALL" → cualquier eventType pasa.
//   - chatType: any pasa; group requiere chat con sufijo @g.us;
//     individual requiere chat no-grupo y no-newsletter.
//   - chatIDs vacío → no filtra; no vacío + chatJID="" → rechaza
//     (allowlist con dato faltante = no pasa).
//   - senders idem.
func MatchesFilter(w *webhook_model.Webhook, eventType, chatJID, senderJID string) bool {
	if !w.Enabled {
		return false
	}
	if !matchEvents(w.Events, eventType) {
		return false
	}
	if !matchChatType(w.ChatType, chatJID) {
		return false
	}
	if !matchAllowlist(w.ChatIDs, chatJID) {
		return false
	}
	if !matchAllowlist(w.Senders, senderJID) {
		return false
	}
	return true
}

func matchEvents(events []string, eventType string) bool {
	if len(events) == 0 {
		return true
	}
	for _, e := range events {
		if e == event_types.ALL || strings.EqualFold(e, eventType) {
			return true
		}
	}
	return false
}

func matchChatType(chatType, chatJID string) bool {
	switch chatType {
	case "", webhook_model.ChatTypeAny:
		return true
	case webhook_model.ChatTypeGroup:
		return strings.HasSuffix(chatJID, "@g.us")
	case webhook_model.ChatTypeIndividual:
		return chatJID != "" &&
			!strings.HasSuffix(chatJID, "@g.us") &&
			!strings.HasSuffix(chatJID, "@newsletter") &&
			!strings.HasSuffix(chatJID, "@broadcast")
	}
	return true
}

// matchAllowlist: vacía = pasa. No vacía + jid="" = rechaza.
// No vacía + jid match = pasa.
func matchAllowlist(allow []string, jid string) bool {
	if len(allow) == 0 {
		return true
	}
	if jid == "" {
		return false
	}
	for _, a := range allow {
		if a == jid {
			return true
		}
	}
	return false
}

// Dispatch evalúa el cache y dispara webhookProducer.Produce por cada
// match. Fire-and-forget consistente con el producer (mismas 5 retries
// internas, no propaga errores).
func (s *webhookService) Dispatch(instanceID, eventType, chatJID, senderJID string, jsonData []byte) {
	whs := s.getCached(instanceID)
	if len(whs) == 0 {
		return
	}
	for i := range whs {
		w := &whs[i]
		if !MatchesFilter(w, eventType, chatJID, senderJID) {
			continue
		}
		// queueName mock — el producer arma el split internamente; le
		// pasamos `<instance>.<event>` igual que el legacy.
		queueName := strings.ToLower(fmt.Sprintf("%s.%s", instanceID, eventType))
		_ = s.producer.Produce(queueName, jsonData, w.URL, instanceID)
	}
}

// ExtractChatSender mira los shapes conocidos de payloads whatsmeow
// (Message: data.Info.Chat/Sender; Receipt/Presence: data.Chat/Sender;
// LegacyBuiltMaps: data.chat/sender en lowercase). Devuelve "" si no
// encuentra — semántica de allowlist se ocupa del resto.
func (s *webhookService) ExtractChatSender(data map[string]interface{}) (string, string) {
	inner, _ := data["data"].(map[string]interface{})
	if inner == nil {
		return "", ""
	}
	chat := pickString(inner, "Chat", "chat", "RemoteJid", "remoteJid")
	sender := pickString(inner, "Sender", "sender", "Participant", "participant")
	// Message events tienen data.data.Info.{Chat,Sender}
	if info, ok := inner["Info"].(map[string]interface{}); ok {
		if chat == "" {
			chat = pickString(info, "Chat", "chat")
		}
		if sender == "" {
			sender = pickString(info, "Sender", "sender")
		}
	}
	return chat, sender
}

func pickString(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k].(string); ok && v != "" {
			return v
		}
	}
	return ""
}
