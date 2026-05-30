package webhook_handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	producer_interfaces "github.com/webapp-wago/webapp-wago/pkg/events/interfaces"
	instance_model "github.com/webapp-wago/webapp-wago/pkg/instance/model"
	webhook_model "github.com/webapp-wago/webapp-wago/pkg/webhook/model"
	webhook_service "github.com/webapp-wago/webapp-wago/pkg/webhook/service"
)

// fakeWebhookService implementa webhook_service.WebhookService para
// tests de handler — devuelve canned results sin tocar DB.
type fakeWebhookService struct {
	createErr   error
	updateErr   error
	deleteErr   error
	listErr     error
	createdWh   *webhook_model.Webhook
	updatedWh   *webhook_model.Webhook
	listResult  []webhook_model.Webhook
}

func (f *fakeWebhookService) List(instanceID string) ([]webhook_model.Webhook, error) {
	return f.listResult, f.listErr
}
func (f *fakeWebhookService) Get(instanceID, id string) (*webhook_model.Webhook, error) {
	return nil, errors.New("not impl")
}
func (f *fakeWebhookService) Create(instanceID string, in *webhook_service.WebhookInput) (*webhook_model.Webhook, error) {
	return f.createdWh, f.createErr
}
func (f *fakeWebhookService) Update(instanceID, id string, in *webhook_service.WebhookInput) (*webhook_model.Webhook, error) {
	return f.updatedWh, f.updateErr
}
func (f *fakeWebhookService) Delete(instanceID, id string) error { return f.deleteErr }
func (f *fakeWebhookService) DeleteByInstance(instanceID string) error { return nil }
func (f *fakeWebhookService) Dispatch(instanceID, eventType, chatJID, senderJID string, isFromMe bool, jsonData []byte) {
}
func (f *fakeWebhookService) ExtractEventMeta(data map[string]interface{}) (string, string, bool) {
	return "", "", false
}
func (f *fakeWebhookService) Reload(instanceID string) error    { return nil }
func (f *fakeWebhookService) InvalidateNames(instanceID string) {}
func (f *fakeWebhookService) SetTransports(_, _, _ producer_interfaces.Producer) {
}

func newCtxWithInstance(method, path, body string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	req = req.WithContext(context.Background())
	c.Request = req
	c.Set("instance", &instance_model.Instance{Id: "inst-1", Token: "t"})
	return c, w
}

func TestList_ReturnsServiceData(t *testing.T) {
	svc := &fakeWebhookService{
		listResult: []webhook_model.Webhook{
			{ID: "w1", InstanceID: "inst-1", URL: "https://x/"},
		},
	}
	h := &webhookHandler{service: svc}
	c, w := newCtxWithInstance("GET", "/webhook", "")
	h.List(c)
	if w.Code != 200 {
		t.Fatalf("status=%d, want 200", w.Code)
	}
	if !strings.Contains(w.Body.String(), "w1") {
		t.Errorf("body=%s, want id w1", w.Body.String())
	}
}

func TestCreate_RejectsBadJSON(t *testing.T) {
	svc := &fakeWebhookService{}
	h := &webhookHandler{service: svc}
	c, w := newCtxWithInstance("POST", "/webhook", "not-json")
	h.Create(c)
	if w.Code != 400 {
		t.Fatalf("status=%d, want 400 for bad json", w.Code)
	}
}

func TestCreate_PropagatesServiceError(t *testing.T) {
	svc := &fakeWebhookService{createErr: errors.New("url inválida: blah")}
	h := &webhookHandler{service: svc}
	body, _ := json.Marshal(map[string]interface{}{"url": "http://localhost/x"})
	c, w := newCtxWithInstance("POST", "/webhook", string(body))
	h.Create(c)
	if w.Code != 400 {
		t.Fatalf("status=%d, want 400 for service validation error", w.Code)
	}
	if !strings.Contains(w.Body.String(), "url inválida") {
		t.Errorf("body=%s, want 'url inválida' in error", w.Body.String())
	}
}

func TestUpdate_RequiresID(t *testing.T) {
	svc := &fakeWebhookService{}
	h := &webhookHandler{service: svc}
	body, _ := json.Marshal(map[string]interface{}{"url": "https://x/"})
	c, w := newCtxWithInstance("PUT", "/webhook/", string(body))
	// Sin set del param ID
	h.Update(c)
	if w.Code != 400 {
		t.Fatalf("status=%d, want 400 when id missing", w.Code)
	}
}
