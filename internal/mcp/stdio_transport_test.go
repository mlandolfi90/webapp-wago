package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"strings"
	"testing"
	"time"
)

func TestServeStdioHandshakeAndNotification(t *testing.T) {
	in := strings.NewReader(
		`{"jsonrpc":"2.0","id":1,"method":"initialize"}` + "\n" +
			`{"jsonrpc":"2.0","method":"notifications/initialized"}` + "\n" +
			`{"jsonrpc":"2.0","id":2,"method":"tools/list"}` + "\n")
	pr, pw := io.Pipe()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- testServer().ServeStdio(ctx, in, pw) }()

	sc := bufio.NewScanner(pr)
	got := []map[string]any{}
	for len(got) < 2 && sc.Scan() {
		var m map[string]any
		if err := json.Unmarshal(sc.Bytes(), &m); err != nil {
			t.Fatalf("salida no-JSON: %q", sc.Text())
		}
		got = append(got, m)
	}
	// Solo 2 respuestas (initialize + tools/list); la notificación NO responde.
	if len(got) != 2 {
		t.Fatalf("esperaba 2 respuestas, hubo %d: %v", len(got), got)
	}
	if got[0]["id"].(float64) != 1 || got[1]["id"].(float64) != 2 {
		t.Fatalf("ids/orden inesperado: %v", got)
	}
	if got[0]["result"].(map[string]any)["protocolVersion"] != ProtocolVersion {
		t.Fatalf("initialize result: %v", got[0])
	}
	cancel()
	_ = pw.Close()
	select {
	case <-done:
	case <-time.After(time.Second):
	}
}
