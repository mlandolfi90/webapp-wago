package events

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWebhookStoresPost(t *testing.T) {
	b := New(10)
	h := Handler(b)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/webhook", strings.NewReader(`{"type":"MESSAGE","body":"hola"}`))
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if b.Len() != 1 {
		t.Fatalf("no se bufferizó: len = %d", b.Len())
	}
	if got := b.Poll("MESSAGE", 0); len(got) != 1 {
		t.Fatalf("evento no recuperable: %+v", got)
	}
}

func TestWebhookRejectsGet(t *testing.T) {
	rec := httptest.NewRecorder()
	Handler(New(1)).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/webhook", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET status = %d, want 405", rec.Code)
	}
}

func TestWebhookRejectsEmpty(t *testing.T) {
	rec := httptest.NewRecorder()
	Handler(New(1)).ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/webhook", strings.NewReader("")))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("empty status = %d, want 400", rec.Code)
	}
}
