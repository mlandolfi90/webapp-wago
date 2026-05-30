package webhook_service

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"path"
	"strings"
	"sync"

	producer_interfaces "github.com/webapp-wago/webapp-wago/pkg/events/interfaces"
	event_types "github.com/webapp-wago/webapp-wago/pkg/internal/event_types"
	logger_wrapper "github.com/webapp-wago/webapp-wago/pkg/logger"
	webhook_model "github.com/webapp-wago/webapp-wago/pkg/webhook/model"
	webhook_repository "github.com/webapp-wago/webapp-wago/pkg/webhook/repository"
)

// NameResolver resuelve JID → nombre humano (grupo o contacto). La
// interface vive acá para evitar ciclo de import: whatsmeowService
// ya depende de webhookService (Dispatch); el resolver concreto vive
// en pkg/webhook/resolver/ y se inyecta en main.go.
type NameResolver interface {
	GroupNames(ctx context.Context, instanceID string) (map[string]string, error)
	ContactNames(ctx context.Context, instanceID string) (map[string]string, error)
}

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
	// isFromMe permite filtrar mensajes propios per-webhook (ver
	// Webhook.IgnoreFromMe, WAGO-PATCH(ADR-0049)).
	Dispatch(instanceID, eventType, chatJID, senderJID string, isFromMe bool, jsonData []byte)

	// ExtractEventMeta saca chatJID, senderJID y el flag isFromMe del
	// payload parseado del evento (best-effort, sobre los shapes
	// conocidos de whatsmeow). isFromMe lee data.data.Info.IsFromMe;
	// default false para eventos no-Message.
	ExtractEventMeta(data map[string]interface{}) (chatJID, senderJID string, isFromMe bool)

	// Reload fuerza recarga del cache para una instancia (testing).
	Reload(instanceID string) error

	// InvalidateNames descarta el cache de nombres (grupos/contactos)
	// de la instancia. Se invoca desde el listener de eventos
	// whatsmeow ante GroupInfo/JoinedGroup/Contact/Connected.
	InvalidateNames(instanceID string)

	// WAGO-PATCH(ADR-0055): inyecta los producers opcionales para los
	// transports per-webhook. Cualquier arg puede ser nil si la config
	// global no levantó ese transport. Llamar después de NewWebhookService.
	SetTransports(rabbitmq, websocket, nats producer_interfaces.Producer)
}

// WebhookInput es el body que aceptan Create/Update — separado del
// model para no exponer ID/CreatedAt en el contrato de entrada.
type WebhookInput struct {
	URL         string   `json:"url"`
	Enabled     *bool    `json:"enabled,omitempty"`
	Events      []string `json:"events,omitempty"`
	ChatType    string   `json:"chatType,omitempty"`
	ChatIDs     []string `json:"chatIds,omitempty"`
	Senders     []string `json:"senders,omitempty"`
	ChatNames   []string `json:"chatNames,omitempty"`
	SenderNames []string `json:"senderNames,omitempty"`
	// WAGO-PATCH(ADR-0049): puntero para que Update distinga ausente
	// (no toca) de false (auditar salientes explícitamente).
	IgnoreFromMe *bool `json:"ignoreFromMe,omitempty"`
	// WAGO-PATCH(ADR-0055): transports adicionales per-webhook. Punteros
	// para distinguir ausente (no toca) de false (apaga). Default false
	// cuando ausente — el HTTP POST a URL sigue siendo el dispatch base.
	RabbitmqEnable  *bool `json:"rabbitmqEnable,omitempty"`
	WebsocketEnable *bool `json:"websocketEnable,omitempty"`
	NatsEnable      *bool `json:"natsEnable,omitempty"`
}

// instanceNames cachea los nombres resueltos de una instancia. Las
// flags `groupsLoaded`/`contactsLoaded` evitan re-fetchear cuando un
// dispatch solo necesita una de las dos dimensiones.
type instanceNames struct {
	groups         map[string]string
	contacts       map[string]string
	groupsLoaded   bool
	contactsLoaded bool
}

type webhookService struct {
	repo     webhook_repository.WebhookRepository
	producer producer_interfaces.Producer
	logger   *logger_wrapper.LoggerManager
	resolver NameResolver

	// WAGO-PATCH(ADR-0055): producers opcionales para transports
	// adicionales per-webhook. Cualquiera puede ser nil (config global
	// apagada o no inyectado en tests) — Dispatch chequea antes de
	// publicar.
	rabbitmqProducer  producer_interfaces.Producer
	websocketProducer producer_interfaces.Producer
	natsProducer      producer_interfaces.Producer

	mu    sync.RWMutex
	cache map[string][]webhook_model.Webhook

	nameMu    sync.RWMutex
	nameCache map[string]*instanceNames
}

func NewWebhookService(
	repo webhook_repository.WebhookRepository,
	producer producer_interfaces.Producer,
	logger *logger_wrapper.LoggerManager,
	resolver NameResolver,
) WebhookService {
	return &webhookService{
		repo:      repo,
		producer:  producer,
		logger:    logger,
		resolver:  resolver,
		cache:     map[string][]webhook_model.Webhook{},
		nameCache: map[string]*instanceNames{},
	}
}

// WAGO-PATCH(ADR-0055): SetTransports inyecta los producers opcionales
// para transports per-webhook. Se llama desde main.go después de
// construir cada producer global (puede ser nil si la config está
// apagada). Setter en vez de extender el constructor para no romper
// llamadores existentes (tests + main upstream).
//
// Tomamos el mismo `mu` que el cache. En la práctica `main.go` llama
// SetTransports una vez antes de aceptar tráfico, pero protegerlo:
// (a) sile el race detector si alguna corrida futura llama desde otro
// goroutine, (b) habilita reload dinámico sin reescribir el setter.
func (s *webhookService) SetTransports(
	rabbitmq, websocket, nats producer_interfaces.Producer,
) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.rabbitmqProducer = rabbitmq
	s.websocketProducer = websocket
	s.natsProducer = nats
}

// getTransports devuelve una snapshot de los 3 producers opcionales
// bajo el RLock. Llamado por Dispatch para evitar leer los fields sin
// sincronización (race con SetTransports).
func (s *webhookService) getTransports() (
	rabbitmq, websocket, nats producer_interfaces.Producer,
) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.rabbitmqProducer, s.websocketProducer, s.natsProducer
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
	// WAGO-PATCH(ADR-0049): default true cuando ausente — clientes
	// (UI/MCP/curl) que no manden el campo quedan protegidos del loop.
	ignoreFromMe := true
	if in.IgnoreFromMe != nil {
		ignoreFromMe = *in.IgnoreFromMe
	}
	// WAGO-PATCH(ADR-0055): default false cuando ausente — solo URL es
	// transport siempre activo. Quien quiera RabbitMQ/WS/NATS lo activa
	// explícito en el form.
	rabbitmqEnable := false
	if in.RabbitmqEnable != nil {
		rabbitmqEnable = *in.RabbitmqEnable
	}
	websocketEnable := false
	if in.WebsocketEnable != nil {
		websocketEnable = *in.WebsocketEnable
	}
	natsEnable := false
	if in.NatsEnable != nil {
		natsEnable = *in.NatsEnable
	}
	return &webhook_model.Webhook{
		InstanceID:      instanceID,
		URL:             strings.TrimSpace(in.URL),
		Enabled:         enabled,
		Events:          in.Events,
		ChatType:        chatType,
		ChatIDs:         in.ChatIDs,
		Senders:         in.Senders,
		ChatNames:       in.ChatNames,
		SenderNames:     in.SenderNames,
		IgnoreFromMe:    ignoreFromMe,
		RabbitmqEnable:  rabbitmqEnable,
		WebsocketEnable: websocketEnable,
		NatsEnable:      natsEnable,
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

// MatchesFilter es pura: dado un webhook y los datos del evento
// (JIDs + nombres resueltos), dice si dispara o no. Semántica
// allowlist (todas AND, una bloquea si falla):
//   - events vacío o contiene "ALL" → cualquier eventType pasa.
//   - chatType: any pasa; group requiere @g.us; individual no-grupo.
//   - chatIDs/senders vacío → no filtra; no vacío + jid="" → rechaza.
//   - chatNames/senderNames vacío → no filtra; no vacío + name="" →
//     rechaza (allowlist con dato faltante = no pasa). Patrón glob.
//   - isFromMe + IgnoreFromMe → rechaza (WAGO-PATCH(ADR-0049):
//     evita loops cuando un consumer responde con /send/text).
func MatchesFilter(w *webhook_model.Webhook, eventType, chatJID, senderJID, chatName, senderName string, isFromMe bool) bool {
	if !w.Enabled {
		return false
	}
	if isFromMe && w.IgnoreFromMe {
		return false
	}
	if !matchEvents(w.Events, eventType) {
		return false
	}
	if !matchChatType(w.ChatType, chatJID) {
		return false
	}
	if !matchPatternAllowlist(w.ChatIDs, chatJID) {
		return false
	}
	if !matchPatternAllowlist(w.Senders, senderJID) {
		return false
	}
	if !matchPatternAllowlist(w.ChatNames, chatName) {
		return false
	}
	if !matchPatternAllowlist(w.SenderNames, senderName) {
		return false
	}
	return true
}

// webhookNeedsNames informa si el filtro mira nombres en alguna
// dimensión. Sirve al Dispatch para evitar lookups (potencialmente
// remotos) si ningún webhook los requiere.
func webhookNeedsNames(w *webhook_model.Webhook) bool {
	return len(w.ChatNames) > 0 || len(w.SenderNames) > 0
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

// matchPatternAllowlist: vacía = pasa. No vacía + value="" = rechaza
// (no permite bypass con `*` cuando falta el dato). Cada entry es:
//   - exact match si no contiene metacaracteres glob (`*`, `?`, `[`)
//   - glob estilo shell vía `path.Match` si los contiene
//     (`*@g.us`, `549*`, `Harness*`, `Soporte L?`, etc.).
// Función única para JIDs y nombres — sólo cambia el `value`.
func matchPatternAllowlist(allow []string, value string) bool {
	if len(allow) == 0 {
		return true
	}
	if value == "" {
		return false
	}
	for _, a := range allow {
		if a == value {
			return true
		}
		if strings.ContainsAny(a, "*?[") {
			if ok, _ := path.Match(a, value); ok {
				return true
			}
		}
	}
	return false
}

// Dispatch evalúa el cache y dispara webhookProducer.Produce por cada
// match. Fire-and-forget consistente con el producer (mismas 5 retries
// internas, no propaga errores). Si algún webhook usa filtro por
// nombre, resuelve nombres una sola vez (lookup cacheado en RAM por
// instancia, con flags `groupsLoaded`/`contactsLoaded` para no
// refetchear).
func (s *webhookService) Dispatch(instanceID, eventType, chatJID, senderJID string, isFromMe bool, jsonData []byte) {
	whs := s.getCached(instanceID)
	if len(whs) == 0 {
		return
	}

	// Solo resolvemos nombres si algún webhook los pide.
	var chatName, senderName string
	needNames := false
	for i := range whs {
		if webhookNeedsNames(&whs[i]) {
			needNames = true
			break
		}
	}
	if needNames {
		if strings.HasSuffix(chatJID, "@g.us") {
			chatName = s.groupName(instanceID, chatJID)
		}
		if senderJID != "" {
			senderName = s.contactName(instanceID, senderJID)
		}
	}

	// Snapshot de los transports bajo el RLock (WAGO-PATCH(ADR-0055)).
	rabbitmq, websocket, nats := s.getTransports()

	for i := range whs {
		w := &whs[i]
		if !MatchesFilter(w, eventType, chatJID, senderJID, chatName, senderName, isFromMe) {
			continue
		}
		queueName := strings.ToLower(fmt.Sprintf("%s.%s", instanceID, eventType))
		// HTTP POST a w.URL: dispatch base, siempre activo.
		_ = s.producer.Produce(queueName, jsonData, w.URL, instanceID)

		// WAGO-PATCH(ADR-0055): transports adicionales per-webhook. Cada
		// uno se publica solo si el flag del webhook está en true Y el
		// producer global fue inyectado (config global del transport
		// levantada). Los errores se ignoran (consistente con el HTTP
		// producer arriba) — fire-and-forget.
		if w.RabbitmqEnable && rabbitmq != nil {
			_ = rabbitmq.Produce(queueName, jsonData, w.URL, instanceID)
		}
		if w.WebsocketEnable && websocket != nil {
			_ = websocket.Produce(queueName, jsonData, w.URL, instanceID)
		}
		if w.NatsEnable && nats != nil {
			_ = nats.Produce(queueName, jsonData, w.URL, instanceID)
		}
	}
}

// groupName devuelve el nombre humano del grupo. Lazy-load del map
// completo de la instancia (una sola llamada a `GetJoinedGroups`).
func (s *webhookService) groupName(instanceID, jid string) string {
	s.nameMu.RLock()
	if inst, ok := s.nameCache[instanceID]; ok && inst.groupsLoaded {
		n := inst.groups[jid]
		s.nameMu.RUnlock()
		return n
	}
	s.nameMu.RUnlock()
	if s.resolver == nil {
		return ""
	}
	names, err := s.resolver.GroupNames(context.Background(), instanceID)
	if err != nil {
		return ""
	}
	s.nameMu.Lock()
	inst := s.nameCache[instanceID]
	if inst == nil {
		inst = &instanceNames{}
		s.nameCache[instanceID] = inst
	}
	inst.groups = names
	inst.groupsLoaded = true
	s.nameMu.Unlock()
	return names[jid]
}

// contactName devuelve el nombre humano del contacto. Lazy-load.
func (s *webhookService) contactName(instanceID, jid string) string {
	s.nameMu.RLock()
	if inst, ok := s.nameCache[instanceID]; ok && inst.contactsLoaded {
		n := inst.contacts[jid]
		s.nameMu.RUnlock()
		return n
	}
	s.nameMu.RUnlock()
	if s.resolver == nil {
		return ""
	}
	names, err := s.resolver.ContactNames(context.Background(), instanceID)
	if err != nil {
		return ""
	}
	s.nameMu.Lock()
	inst := s.nameCache[instanceID]
	if inst == nil {
		inst = &instanceNames{}
		s.nameCache[instanceID] = inst
	}
	inst.contacts = names
	inst.contactsLoaded = true
	s.nameMu.Unlock()
	return names[jid]
}

// InvalidateNames descarta el cache de nombres de la instancia
// (próximo Dispatch que pida nombres los re-resolverá).
func (s *webhookService) InvalidateNames(instanceID string) {
	s.nameMu.Lock()
	delete(s.nameCache, instanceID)
	s.nameMu.Unlock()
}

// ExtractEventMeta mira los shapes conocidos de payloads whatsmeow
// (Message: data.Info.Chat/Sender/IsFromMe; Receipt/Presence:
// data.Chat/Sender; LegacyBuiltMaps: data.chat/sender en lowercase).
// Devuelve "" / false si no encuentra — semántica de allowlist se
// ocupa del resto, y isFromMe=false es el default seguro (eventos
// no-Message no son auto-originados). WAGO-PATCH(ADR-0049).
func (s *webhookService) ExtractEventMeta(data map[string]interface{}) (string, string, bool) {
	inner, _ := data["data"].(map[string]interface{})
	if inner == nil {
		return "", "", false
	}
	chat := pickString(inner, "Chat", "chat", "RemoteJid", "remoteJid")
	sender := pickString(inner, "Sender", "sender", "Participant", "participant")
	var isFromMe bool
	// Message events tienen data.data.Info.{Chat,Sender,IsFromMe}
	if info, ok := inner["Info"].(map[string]interface{}); ok {
		if chat == "" {
			chat = pickString(info, "Chat", "chat")
		}
		if sender == "" {
			sender = pickString(info, "Sender", "sender")
		}
		if v, ok := info["IsFromMe"].(bool); ok {
			isFromMe = v
		}
	}
	return chat, sender, isFromMe
}

func pickString(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k].(string); ok && v != "" {
			return v
		}
	}
	return ""
}
