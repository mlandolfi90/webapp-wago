package wago

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestDoContextDeadline(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(200 * time.Millisecond)
		_, _ = w.Write([]byte(`{"data":1}`))
	}))
	defer srv.Close()

	c := New(srv.URL, "K")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Millisecond)
	defer cancel()
	if _, err := c.Do(ctx, Admin, "GET", "/x", nil); err == nil {
		t.Fatal("deadline excedido debía dar error")
	}
}

func TestDoInvalidJSONOn2xxIsNotError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("no-json-aqui"))
	}))
	defer srv.Close()

	c := New(srv.URL, "K")
	got, err := c.Do(context.Background(), Admin, "GET", "/x", nil)
	if err != nil {
		t.Fatalf("2xx con body no-JSON no debía ser error: %v", err)
	}
	if got != nil {
		t.Fatalf("body no-JSON => parsed nil; got %v", got)
	}
}

func TestDoPOSTSendsBodyAndContentType(t *testing.T) {
	var ct string
	var body []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ct = r.Header.Get("Content-Type")
		body, _ = io.ReadAll(r.Body)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":"ok"}`))
	}))
	defer srv.Close()

	c := New(srv.URL, "K")
	c.UseInstance("TOK")
	if _, err := c.Do(context.Background(), Instance, "POST", "/send/text", map[string]any{"number": "549", "text": "hi"}); err != nil {
		t.Fatalf("POST: %v", err)
	}
	if ct != "application/json" {
		t.Fatalf("Content-Type = %q", ct)
	}
	if len(body) == 0 || string(body) == "null" {
		t.Fatalf("body no enviado: %q", body)
	}
}

func TestDoNetworkErrorPropagates(t *testing.T) {
	// Puerto cerrado → error de conexión.
	c := New("http://127.0.0.1:1", "K")
	if _, err := c.Do(context.Background(), Admin, "GET", "/x", nil); err == nil {
		t.Fatal("conexión imposible debía dar error")
	}
}
