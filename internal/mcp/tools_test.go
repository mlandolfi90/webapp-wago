package mcp

import (
	"context"
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
