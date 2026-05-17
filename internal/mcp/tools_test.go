package mcp

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/webapp-wago/webapp-wago/internal/wago"
)

func TestBuildToolsCatalog(t *testing.T) {
	c := wago.New("http://x", "K")
	tools := BuildTools(c)
	if len(tools) < 50 {
		t.Fatalf("se esperaban >=50 tools, hay %d", len(tools))
	}
	seen := map[string]bool{}
	for _, tl := range tools {
		if tl.Name == "" || tl.Handler == nil || len(tl.InputSchema) == 0 {
			t.Fatalf("tool incompleta: %+v", tl.Name)
		}
		if seen[tl.Name] {
			t.Fatalf("nombre de tool duplicado: %s", tl.Name)
		}
		seen[tl.Name] = true
	}
}

func TestPathParamToolBuildsURL(t *testing.T) {
	var gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.EscapedPath() // forma tal como viajó por el cable
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":"ok"}`))
	}))
	defer srv.Close()

	c := wago.New(srv.URL, "ADMIN")
	var del Tool
	for _, tl := range BuildTools(c) {
		if tl.Name == "wago_instance_delete" {
			del = tl
		}
	}
	if del.Name == "" {
		t.Fatal("wago_instance_delete no está en el catálogo")
	}
	if _, err := del.Handler(context.Background(), map[string]any{"instanceId": "ab cd/e"}); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if gotPath != "/instance/delete/ab%20cd%2Fe" {
		t.Fatalf("path mal construido/escapado: %q", gotPath)
	}
}

func TestMarkReadForwardsParticipant(t *testing.T) {
	var body map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&body)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":"ok"}`))
	}))
	defer srv.Close()

	c := wago.New(srv.URL, "ADMIN")
	c.UseInstance("TOK")
	var mr Tool
	for _, tl := range BuildTools(c) {
		if tl.Name == "wago_mark_read" {
			mr = tl
		}
	}
	if mr.Name == "" {
		t.Fatal("wago_mark_read ausente")
	}
	if _, err := mr.Handler(context.Background(), map[string]any{
		"number": "12036@g.us", "id": []any{"M1"}, "participant": "549111@s.whatsapp.net",
	}); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if body["participant"] != "549111@s.whatsapp.net" {
		t.Fatalf("participant no propagado: %v", body)
	}
	// Sin participant: no debe aparecer la clave (retrocompat).
	body = nil
	if _, err := mr.Handler(context.Background(), map[string]any{
		"number": "549111", "id": []any{"M1"},
	}); err != nil {
		t.Fatalf("handler 2: %v", err)
	}
	if _, ok := body["participant"]; ok {
		t.Fatalf("participant no debía estar: %v", body)
	}
}

func TestInstanceScopeRequiresActiveToken(t *testing.T) {
	c := wago.New("http://x", "ADMIN")
	var status Tool
	for _, tl := range BuildTools(c) {
		if tl.Name == "wago_status" {
			status = tl
		}
	}
	if _, err := status.Handler(context.Background(), map[string]any{}); err == nil {
		t.Fatal("tool instance-scoped sin instancia activa debía fallar")
	}
}
