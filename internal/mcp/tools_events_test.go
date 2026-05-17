package mcp

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/webapp-wago/webapp-wago/internal/events"
)

func TestEventToolsPollAndClear(t *testing.T) {
	buf := events.New(10)
	buf.Push(json.RawMessage(`{"type":"MESSAGE","n":1}`))
	buf.Push(json.RawMessage(`{"type":"CONNECTION"}`))

	tools := EventTools(buf)
	var poll, clear Tool
	for _, tl := range tools {
		switch tl.Name {
		case "wago_events_poll":
			poll = tl
		case "wago_events_clear":
			clear = tl
		}
	}
	if poll.Name == "" || clear.Name == "" {
		t.Fatal("faltan tools de eventos")
	}

	out, err := poll.Handler(context.Background(), map[string]any{"type": "MESSAGE"})
	if err != nil {
		t.Fatalf("poll: %v", err)
	}
	if !strings.Contains(out, `"count": 1`) || !strings.Contains(out, `"remaining": 1`) {
		t.Fatalf("poll output inesperado: %s", out)
	}

	msg, err := clear.Handler(context.Background(), map[string]any{})
	if err != nil {
		t.Fatalf("clear: %v", err)
	}
	if !strings.Contains(msg, "1 eventos") || buf.Len() != 0 {
		t.Fatalf("clear no vació: %q len=%d", msg, buf.Len())
	}
}
