package webhook_repository

import (
	webhook_model "github.com/webapp-wago/webapp-wago/pkg/webhook/model"
	"gorm.io/gorm"
)

type WebhookRepository interface {
	List(instanceID string) ([]webhook_model.Webhook, error)
	Get(id string) (*webhook_model.Webhook, error)
	Create(w *webhook_model.Webhook) error
	Update(w *webhook_model.Webhook) error
	Delete(id, instanceID string) error
	DeleteByInstance(instanceID string) error
	CountByInstance(instanceID string) (int64, error)
}

type webhookRepository struct {
	db *gorm.DB
}

func NewWebhookRepository(db *gorm.DB) WebhookRepository {
	return &webhookRepository{db: db}
}

func (r *webhookRepository) List(instanceID string) ([]webhook_model.Webhook, error) {
	var out []webhook_model.Webhook
	err := r.db.Where("instance_id = ?", instanceID).Order("created_at asc").Find(&out).Error
	return out, err
}

func (r *webhookRepository) Get(id string) (*webhook_model.Webhook, error) {
	var w webhook_model.Webhook
	if err := r.db.Where("id = ?", id).First(&w).Error; err != nil {
		return nil, err
	}
	return &w, nil
}

func (r *webhookRepository) Create(w *webhook_model.Webhook) error {
	return r.db.Create(w).Error
}

func (r *webhookRepository) Update(w *webhook_model.Webhook) error {
	return r.db.Save(w).Error
}

func (r *webhookRepository) Delete(id, instanceID string) error {
	return r.db.Where("id = ? AND instance_id = ?", id, instanceID).
		Delete(&webhook_model.Webhook{}).Error
}

func (r *webhookRepository) DeleteByInstance(instanceID string) error {
	return r.db.Where("instance_id = ?", instanceID).
		Delete(&webhook_model.Webhook{}).Error
}

func (r *webhookRepository) CountByInstance(instanceID string) (int64, error) {
	var n int64
	err := r.db.Model(&webhook_model.Webhook{}).
		Where("instance_id = ?", instanceID).Count(&n).Error
	return n, err
}
