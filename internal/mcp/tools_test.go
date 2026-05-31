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

func TestSendAlbumBuildsBody(t *testing.T) {
	var body map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&body)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":"ok"}`))
	}))
	defer srv.Close()

	c := wago.New(srv.URL, "ADMIN")
	c.UseInstance("TOK")
	var al Tool
	for _, tl := range BuildTools(c) {
		if tl.Name == "wago_send_album" {
			al = tl
		}
	}
	if al.Name == "" {
		t.Fatal("wago_send_album ausente")
	}

	// < 2 items => error.
	if _, err := al.Handler(context.Background(), map[string]any{
		"number": "549111", "items": []any{map[string]any{"type": "image", "url": "u"}},
	}); err == nil {
		t.Fatal("debía exigir >=2 items")
	}

	// OK con 2 items + caption.
	if _, err := al.Handler(context.Background(), map[string]any{
		"number":  "549111",
		"caption": "hola",
		"items": []any{
			map[string]any{"type": "image", "url": "u1"},
			map[string]any{"type": "video", "url": "u2"},
		},
	}); err != nil {
		t.Fatalf("handler: %v", err)
	}
	its, _ := body["items"].([]any)
	if len(its) != 2 || body["caption"] != "hola" {
		t.Fatalf("body mal armado: %v", body)
	}

	// Item inválido => error.
	if _, err := al.Handler(context.Background(), map[string]any{
		"number": "549111",
		"items":  []any{map[string]any{"type": "x", "url": "u"}, map[string]any{"type": "image", "url": "u2"}},
	}); err == nil {
		t.Fatal("type inválido debía fallar")
	}
}

func TestProfileToolsUseBackendContractKeys(t *testing.T) {
	cases := []struct {
		tool, arg, wantKey string
	}{
		{"wago_profile_name", "value", "name"},
		{"wago_profile_status", "value", "status"},
		{"wago_profile_picture", "image", "image"},
	}
	for _, tc := range cases {
		t.Run(tc.tool, func(t *testing.T) {
			var body map[string]any
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				_ = json.NewDecoder(r.Body).Decode(&body)
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"data":"ok"}`))
			}))
			defer srv.Close()

			c := wago.New(srv.URL, "ADMIN")
			c.UseInstance("TOK")
			var tl Tool
			for _, x := range BuildTools(c) {
				if x.Name == tc.tool {
					tl = x
				}
			}
			if tl.Name == "" {
				t.Fatalf("%s ausente", tc.tool)
			}
			if _, err := tl.Handler(context.Background(), map[string]any{tc.arg: "V"}); err != nil {
				t.Fatalf("handler: %v", err)
			}
			if body[tc.wantKey] != "V" {
				t.Fatalf("%s: esperaba clave %q=V, body=%v", tc.tool, tc.wantKey, body)
			}
			if len(body) != 1 {
				t.Fatalf("%s: body debía tener solo %q, body=%v", tc.tool, tc.wantKey, body)
			}
		})
	}
}

func TestWebhookCreateForwardsFilterBody(t *testing.T) {
	var body map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&body)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"id":"x"}}`))
	}))
	defer srv.Close()

	c := wago.New(srv.URL, "ADMIN")
	c.UseInstance("TOK")
	var cr Tool
	for _, x := range BuildTools(c) {
		if x.Name == "wago_webhook_create" {
			cr = x
		}
	}
	if cr.Name == "" {
		t.Fatal("wago_webhook_create ausente")
	}

	// URL obligatoria.
	if _, err := cr.Handler(context.Background(), map[string]any{}); err == nil {
		t.Fatal("debía exigir url")
	}

	// OK: pasa todas las dimensiones del filtro.
	if _, err := cr.Handler(context.Background(), map[string]any{
		"url":      "https://x/h",
		"enabled":  true,
		"events":   []any{"MESSAGE", "CONNECTION"},
		"chatType": "group",
		"chatIds":  []any{"12@g.us"},
		"senders":  []any{"a@s.whatsapp.net"},
	}); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if body["url"] != "https://x/h" || body["chatType"] != "group" {
		t.Fatalf("body sin armar bien: %v", body)
	}
	if evs, _ := body["events"].([]any); len(evs) != 2 {
		t.Fatalf("events no propagado: %v", body)
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

// Verifica que las tools de "comportamiento humano" estén presentes
// (markRead + chatPresence). El LLM las usa en el patrón documentado
// en docs/notes/0015-mcp-chat-presence-flow.md.
func TestHumanBehaviorToolsPresent(t *testing.T) {
	c := wago.New("http://x", "K")
	tools := BuildTools(c)
	required := []string{"wago_mark_read", "wago_chat_presence"}
	got := map[string]bool{}
	for _, tl := range tools {
		got[tl.Name] = true
	}
	for _, name := range required {
		if !got[name] {
			t.Errorf("falta tool %q en el catálogo (necesaria para flow humano)", name)
		}
	}
}

func TestChatPresenceToolSendsPOST(t *testing.T) {
	var gotPath, gotMethod string
	var gotBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.EscapedPath()
		gotMethod = r.Method
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"message":"ok"}`))
	}))
	defer srv.Close()

	c := wago.New(srv.URL, "ADMIN")
	tools := BuildTools(c)
	var chatPresence Tool
	for _, tl := range tools {
		if tl.Name == "wago_chat_presence" {
			chatPresence = tl
			break
		}
	}
	if chatPresence.Name == "" {
		t.Fatal("wago_chat_presence no encontrada en catálogo")
	}
	// Setea instance activa para la scoped call
	c.UseInstance("T")
	_, err := chatPresence.Handler(context.Background(), map[string]any{
		"number":  "5491100000000",
		"state":   "composing",
		"isAudio": false,
	})
	if err != nil {
		t.Fatalf("handler error: %v", err)
	}
	if gotMethod != "POST" {
		t.Errorf("método: got %q want POST", gotMethod)
	}
	if gotPath != "/message/presence" {
		t.Errorf("path: got %q want /message/presence", gotPath)
	}
	if gotBody["state"] != "composing" || gotBody["number"] != "5491100000000" {
		t.Errorf("body: got %+v", gotBody)
	}
}

func TestHumanReplyToolPresent(t *testing.T) {
	c := wago.New("http://x", "K")
	tools := BuildTools(c)
	for _, tl := range tools {
		if tl.Name == "wago_human_reply" {
			return
		}
	}
	t.Fatal("wago_human_reply no encontrada en catálogo")
}

func TestHumanReplyOrchestratesThreeCalls(t *testing.T) {
	var calls []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls = append(calls, r.Method+" "+r.URL.EscapedPath())
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"message":"ok"}`))
	}))
	defer srv.Close()
	c := wago.New(srv.URL, "ADMIN")
	c.UseInstance("T")
	tools := BuildTools(c)
	var human Tool
	for _, tl := range tools {
		if tl.Name == "wago_human_reply" {
			human = tl
			break
		}
	}
	if human.Name == "" {
		t.Fatal("missing tool")
	}
	// Texto corto para que el sleep cap sea ~2s (test no demora mucho)
	ctx, cancel := context.WithTimeout(context.Background(), 30*1000*1000*1000) // 30s safety
	defer cancel()
	_, err := human.Handler(ctx, map[string]any{
		"number":     "549@s.whatsapp.net",
		"message_id": "3EBxxx",
		"text":       "ok",
	})
	if err != nil {
		t.Fatalf("handler error: %v", err)
	}
	// Verificar las 3 llamadas en orden esperado
	want := []string{"POST /message/markread", "POST /message/presence", "POST /send/text"}
	if len(calls) != 3 {
		t.Fatalf("esperaba 3 llamadas, hubo %d: %v", len(calls), calls)
	}
	for i, w := range want {
		if calls[i] != w {
			t.Errorf("call[%d] = %q, want %q", i, calls[i], w)
		}
	}
}
