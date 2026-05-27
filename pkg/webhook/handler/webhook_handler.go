package webhook_handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	instance_model "github.com/webapp-wago/webapp-wago/pkg/instance/model"
	webhook_service "github.com/webapp-wago/webapp-wago/pkg/webhook/service"
)

type WebhookHandler interface {
	List(ctx *gin.Context)
	Create(ctx *gin.Context)
	Update(ctx *gin.Context)
	Delete(ctx *gin.Context)
}

type webhookHandler struct {
	service webhook_service.WebhookService
}

func NewWebhookHandler(service webhook_service.WebhookService) WebhookHandler {
	return &webhookHandler{service: service}
}

func instanceFrom(ctx *gin.Context) (*instance_model.Instance, bool) {
	v, exists := ctx.Get("instance")
	if !exists {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "instance not found"})
		return nil, false
	}
	inst, ok := v.(*instance_model.Instance)
	if !ok {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "instance type mismatch"})
		return nil, false
	}
	return inst, true
}

// List
// @Summary Lista los webhooks de la instancia
// @Tags Webhook
// @Produce json
// @Success 200 {object} gin.H
// @Router /webhook [get]
func (h *webhookHandler) List(ctx *gin.Context) {
	inst, ok := instanceFrom(ctx)
	if !ok {
		return
	}
	list, err := h.service.List(inst.Id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "success", "data": list})
}

// Create
// @Summary Crea un webhook con filtro inline
// @Tags Webhook
// @Accept json
// @Produce json
// @Param body body webhook_service.WebhookInput true "Webhook + filtro"
// @Success 201 {object} gin.H
// @Router /webhook [post]
func (h *webhookHandler) Create(ctx *gin.Context) {
	inst, ok := instanceFrom(ctx)
	if !ok {
		return
	}
	var in webhook_service.WebhookInput
	if err := ctx.ShouldBindJSON(&in); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	w, err := h.service.Create(inst.Id, &in)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusCreated, gin.H{"message": "success", "data": w})
}

// Update
// @Summary Actualiza un webhook
// @Tags Webhook
// @Accept json
// @Produce json
// @Param id path string true "Webhook ID"
// @Param body body webhook_service.WebhookInput true "Webhook + filtro"
// @Success 200 {object} gin.H
// @Router /webhook/{id} [put]
func (h *webhookHandler) Update(ctx *gin.Context) {
	inst, ok := instanceFrom(ctx)
	if !ok {
		return
	}
	id := ctx.Param("id")
	if id == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "id requerido"})
		return
	}
	var in webhook_service.WebhookInput
	if err := ctx.ShouldBindJSON(&in); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	w, err := h.service.Update(inst.Id, id, &in)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "success", "data": w})
}

// Delete
// @Summary Borra un webhook
// @Tags Webhook
// @Produce json
// @Param id path string true "Webhook ID"
// @Success 200 {object} gin.H
// @Router /webhook/{id} [delete]
func (h *webhookHandler) Delete(ctx *gin.Context) {
	inst, ok := instanceFrom(ctx)
	if !ok {
		return
	}
	id := ctx.Param("id")
	if id == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "id requerido"})
		return
	}
	if err := h.service.Delete(inst.Id, id); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "success"})
}
