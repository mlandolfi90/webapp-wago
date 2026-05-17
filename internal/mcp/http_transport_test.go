package mcp

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func httpPost(t *testing.T, base, raw string) (int, map[string]any) {
	t.Helper()
	res, err := http.Post(base+"/mcp", "application/json", bytes.NewBufferString(raw))
	if err != nil {
		t.Fatalf("POST: %v", err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	var m map[string]any
	_ = json.Unmarshal(b, &m)
	return res.StatusCode, m
}

func TestHTTPTransportFlow(t *testing.T) {
	ts := httptest.NewServer(testServer().HTTPHandler())
	defer ts.Close()

	// initialize
	_, m := httpPost(t, ts.URL, `{"jsonrpc":"2.0","id":1,"method":"initialize"}`)
	if m["result"].(map[string]any)["protocolVersion"] != ProtocolVersion {
		t.Fatalf("initialize: %v", m)
	}
	// tools/list
	_, m = httpPost(t, ts.URL, `{"jsonrpc":"2.0","id":2,"method":"tools/list"}`)
	if len(m["result"].(map[string]any)["tools"].([]any)) != 1 {
		t.Fatalf("tools/list: %v", m)
	}
	// tools/call
	_, m = httpPost(t, ts.URL, `{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"echo","arguments":{"msg":"x"}}}`)
	c := m["result"].(map[string]any)["content"].([]any)[0].(map[string]any)
	if c["text"] != "ok:x" {
		t.Fatalf("tools/call: %v", m)
	}
}

func TestHTTPHealthz(t *testing.T) {
	ts := httptest.NewServer(testServer().HTTPHandler())
	defer ts.Close()
	res, err := http.Get(ts.URL + "/healthz")
	if err != nil {
		t.Fatalf("healthz: %v", err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	if res.StatusCode != 200 || string(b) != "ok" {
		t.Fatalf("healthz = %d %q", res.StatusCode, b)
	}
}

func TestHTTPMethodNotAllowed(t *testing.T) {
	ts := httptest.NewServer(testServer().HTTPHandler())
	defer ts.Close()
	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/mcp", nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PUT: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("PUT status = %d", res.StatusCode)
	}
}

func TestHTTPInvalidJSON(t *testing.T) {
	ts := httptest.NewServer(testServer().HTTPHandler())
	defer ts.Close()
	_, m := httpPost(t, ts.URL, `{no-json`)
	if m["error"] == nil {
		t.Fatalf("JSON inválido debía dar error JSON-RPC: %v", m)
	}
}

func TestHTTPNotificationAccepted(t *testing.T) {
	ts := httptest.NewServer(testServer().HTTPHandler())
	defer ts.Close()
	res, err := http.Post(ts.URL+"/mcp", "application/json",
		bytes.NewBufferString(`{"jsonrpc":"2.0","method":"notifications/initialized"}`))
	if err != nil {
		t.Fatalf("notif: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusAccepted {
		t.Fatalf("notificación status = %d (want 202)", res.StatusCode)
	}
}
