package wago

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestScopeKeySelection(t *testing.T) {
	var gotKey string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotKey = r.Header.Get("apikey")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"ok":true}}`))
	}))
	defer srv.Close()

	c := New(srv.URL, "ADMIN")

	if _, err := c.Do(context.Background(), Admin, "GET", "/instance/all", nil); err != nil {
		t.Fatalf("admin call: %v", err)
	}
	if gotKey != "ADMIN" {
		t.Fatalf("admin debía usar ADMIN, usó %q", gotKey)
	}

	if _, err := c.Do(context.Background(), Instance, "GET", "/x", nil); err == nil {
		t.Fatal("instance sin token activo debía fallar")
	}

	c.UseInstance("TOK")
	if _, err := c.Do(context.Background(), Instance, "GET", "/x", nil); err != nil {
		t.Fatalf("instance call: %v", err)
	}
	if gotKey != "TOK" {
		t.Fatalf("instance debía usar TOK, usó %q", gotKey)
	}
}

func TestErrorEnvelopePropagated(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(403)
		_, _ = w.Write([]byte(`{"error":"API Key inválida"}`))
	}))
	defer srv.Close()

	c := New(srv.URL, "ADMIN")
	_, err := c.Do(context.Background(), Admin, "GET", "/instance/all", nil)
	if err == nil || !strings.Contains(err.Error(), "API Key inválida") {
		t.Fatalf("debía propagar el error del envelope, got %v", err)
	}
}
