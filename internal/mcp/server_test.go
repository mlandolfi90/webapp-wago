package mcp

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
)

func handle(t *testing.T, s *Server, raw string) *Response {
	t.Helper()
	var req Request
	if err := json.Unmarshal([]byte(raw), &req); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	return s.Handle(context.Background(), &req)
}

func testServer() *Server {
	return NewServer("t", "0", []Tool{
		{
			Name:        "echo",
			Description: "echo",
			InputSchema: schema(`{"type":"object"}`),
			Handler: func(_ context.Context, a map[string]any) (string, error) {
				if a["fail"] == true {
					return "", errors.New("boom")
				}
				return "ok:" + str(a, "msg"), nil
			},
		},
	})
}

func TestInitialize(t *testing.T) {
	r := handle(t, testServer(), `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}`)
	m := r.Result.(map[string]any)
	if m["protocolVersion"] != ProtocolVersion {
		t.Fatalf("proto = %v", m["protocolVersion"])
	}
}

func TestNotificationNoResponse(t *testing.T) {
	if r := handle(t, testServer(), `{"jsonrpc":"2.0","method":"notifications/initialized"}`); r != nil {
		t.Fatalf("notification debe no responder, got %+v", r)
	}
}

func TestToolsList(t *testing.T) {
	r := handle(t, testServer(), `{"jsonrpc":"2.0","id":2,"method":"tools/list"}`)
	tools := r.Result.(map[string]any)["tools"].([]Tool)
	if len(tools) != 1 || tools[0].Name != "echo" {
		t.Fatalf("tools = %+v", tools)
	}
}

func TestToolsCallSuccess(t *testing.T) {
	r := handle(t, testServer(), `{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"echo","arguments":{"msg":"hi"}}}`)
	m := r.Result.(map[string]any)
	if m["isError"] == true {
		t.Fatalf("no debía ser error: %+v", m)
	}
	txt := m["content"].([]map[string]any)[0]["text"]
	if txt != "ok:hi" {
		t.Fatalf("text = %v", txt)
	}
}

func TestToolsCallError(t *testing.T) {
	r := handle(t, testServer(), `{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"echo","arguments":{"fail":true}}}`)
	m := r.Result.(map[string]any)
	if m["isError"] != true {
		t.Fatalf("debía marcar isError: %+v", m)
	}
}

func TestUnknownTool(t *testing.T) {
	r := handle(t, testServer(), `{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"nope","arguments":{}}}`)
	if r.Error == nil || r.Error.Code != codeInvalidParams {
		t.Fatalf("debía fallar con invalidParams: %+v", r)
	}
}

func TestMethodNotFound(t *testing.T) {
	r := handle(t, testServer(), `{"jsonrpc":"2.0","id":6,"method":"bogus"}`)
	if r.Error == nil || r.Error.Code != codeMethodNotFound {
		t.Fatalf("debía ser methodNotFound: %+v", r)
	}
}
