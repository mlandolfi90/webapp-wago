package events

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{}

func wsURL(s *httptest.Server) string {
	return "ws" + strings.TrimPrefix(s.URL, "http")
}

func TestRunWSReceives(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer c.Close()
		_ = c.WriteMessage(websocket.TextMessage, []byte(`{"type":"MESSAGE","body":"hola"}`))
		time.Sleep(300 * time.Millisecond) // mantener abierto un toque
	}))
	defer srv.Close()

	buf := New(10)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	done := make(chan struct{})
	go func() { RunWS(ctx, WSConfig{URL: wsURL(srv), MinBackoff: 5 * time.Millisecond, MaxBackoff: 20 * time.Millisecond}, buf); close(done) }()

	deadline := time.After(1500 * time.Millisecond)
	for buf.Len() == 0 {
		select {
		case <-deadline:
			t.Fatal("no se bufferizó el evento WS")
		case <-time.After(10 * time.Millisecond):
		}
	}
	ev := buf.Poll("MESSAGE", 0)
	if len(ev) != 1 {
		t.Fatalf("evento WS no recuperable: %+v", ev)
	}
	cancel()
	<-done
}

func TestRunWSReconnects(t *testing.T) {
	var conns int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		n := atomic.AddInt32(&conns, 1)
		if n == 1 {
			_ = c.Close() // primera conexión: cae enseguida → fuerza reconnect
			return
		}
		_ = c.WriteMessage(websocket.TextMessage, []byte(`{"type":"CONNECTION"}`))
		time.Sleep(200 * time.Millisecond)
		_ = c.Close()
	}))
	defer srv.Close()

	buf := New(10)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	go RunWS(ctx, WSConfig{URL: wsURL(srv), MinBackoff: 5 * time.Millisecond, MaxBackoff: 30 * time.Millisecond}, buf)

	deadline := time.After(2500 * time.Millisecond)
	for buf.Len() == 0 {
		select {
		case <-deadline:
			t.Fatalf("no reconectó/recibió (conns=%d)", atomic.LoadInt32(&conns))
		case <-time.After(10 * time.Millisecond):
		}
	}
	if atomic.LoadInt32(&conns) < 2 {
		t.Fatalf("esperaba >=2 conexiones (reconnect), hubo %d", conns)
	}
}
