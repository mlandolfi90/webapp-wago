package webhook_model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	ChatTypeAny        = "any"
	ChatTypeGroup      = "group"
	ChatTypeIndividual = "individual"

	MaxWebhooksPerInstance = 20
)

// Webhook es uno de los N destinos de eventos configurables por
// instancia. El filtro es inline (no es entidad reusable) — copiar a
// otro webhook implica volver a cargar las dimensiones. Coexiste con
// el `Instance.Webhook` legacy: ambos disparan en paralelo si los dos
// están configurados.
type Webhook struct {
	ID         string `json:"id" gorm:"type:uuid;primaryKey"`
	InstanceID string `json:"instanceId" gorm:"type:uuid;index;not null"`
	URL        string `json:"url" gorm:"not null"`
	Enabled    bool   `json:"enabled" gorm:"default:true"`

	// Filtro inline. Allowlist semantics: vacío = no filtra esa dimensión.
	// Dimensiones JID: ChatIDs/Senders (matchean contra el JID del
	// evento — soportan wildcards glob `*@g.us`, `549*`, etc).
	// Dimensiones NOMBRE: ChatNames/SenderNames (matchean contra el
	// nombre humano del grupo/contacto — el backend lo resuelve via
	// whatsmeow Store + GetJoinedGroups; soportan glob `Harness*`).
	Events      []string `json:"events" gorm:"serializer:json"`
	ChatType    string   `json:"chatType" gorm:"default:'any'"`
	ChatIDs     []string `json:"chatIds" gorm:"serializer:json"`
	Senders     []string `json:"senders" gorm:"serializer:json"`
	ChatNames   []string `json:"chatNames" gorm:"serializer:json"`
	SenderNames []string `json:"senderNames" gorm:"serializer:json"`

	// WAGO-PATCH(ADR-0049): equivalente per-webhook del flag legacy.
	// Default true: ignora Info.IsFromMe == true para romper loops
	// (webhook → consumer → /send/text → ...). Quien necesite auditar
	// salientes lo destilda en el form.
	IgnoreFromMe bool `json:"ignoreFromMe" gorm:"default:true"`

	// WAGO-PATCH(ADR-0055): transports adicionales per-webhook. Por
	// default solo se dispara el POST HTTP a URL; si alguno de estos 3
	// está en true, el mismo evento (post-filtro) además se publica al
	// transport global configurado (RabbitMQ exchange, NATS subject, o
	// WebSocket broadcaster). Queue/subject custom per-webhook NO se
	// soporta — se usa la cola global de la instancia (out-of-scope ADR).
	RabbitmqEnable  bool `json:"rabbitmqEnable"  gorm:"default:false"`
	WebsocketEnable bool `json:"websocketEnable" gorm:"default:false"`
	NatsEnable      bool `json:"natsEnable"      gorm:"default:false"`

	CreatedAt time.Time `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updatedAt" gorm:"autoUpdateTime"`
}

func (w *Webhook) BeforeCreate(tx *gorm.DB) (err error) {
	if w.ID == "" {
		w.ID = uuid.New().String()
	}
	if w.ChatType == "" {
		w.ChatType = ChatTypeAny
	}
	return
}

func ValidChatType(t string) bool {
	return t == ChatTypeAny || t == ChatTypeGroup || t == ChatTypeIndividual
}
