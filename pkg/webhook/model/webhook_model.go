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
	Events   []string `json:"events" gorm:"serializer:json"`
	ChatType string   `json:"chatType" gorm:"default:'any'"`
	ChatIDs  []string `json:"chatIds" gorm:"serializer:json"`
	Senders  []string `json:"senders" gorm:"serializer:json"`

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
