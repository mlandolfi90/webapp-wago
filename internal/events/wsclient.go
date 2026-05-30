package events

import (
	"context"
	"encoding/json"
	"time"

	"github.com/gorilla/websocket"
)

// WSConfig parametriza el cliente WebSocket entrante. Los backoffs son
// inyectables para poder testear reconexión sin esperas largas.
type WSConfig struct {
	URL        string
	MinBackoff time.Duration
	MaxBackoff time.Duration
	Logf       func(format string, args ...any)
}

// DefaultWSConfig arma una config razonable para producción.
func DefaultWSConfig(url string) WSConfig {
	return WSConfig{
		URL:        url,
		MinBackoff: 1 * time.Second,
		MaxBackoff: 30 * time.Second,
		Logf:       func(string, ...any) {},
	}
}

// RunWS conecta al WS del backend y empuja cada mensaje al buffer.
// Reconecta con backoff exponencial hasta que ctx termine. Aditivo y
// opcional: convive con el webhook (mismo Buffer).
func RunWS(ctx context.Context, cfg WSConfig, buf *Buffer) {
	if cfg.MinBackoff <= 0 {
		cfg.MinBackoff = time.Second
	}
	if cfg.MaxBackoff < cfg.MinBackoff {
		cfg.MaxBackoff = cfg.MinBackoff
	}
	if cfg.Logf == nil {
		cfg.Logf = func(string, ...any) {}
	}
	backoff := cfg.MinBackoff

	for ctx.Err() == nil {
		if connected := dialAndPump(ctx, cfg, buf); connected {
			backoff = cfg.MinBackoff // hubo conexión sana: resetear
		}
		if ctx.Err() != nil {
			return
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
		if backoff *= 2; backoff > cfg.MaxBackoff {
			backoff = cfg.MaxBackoff
		}
	}
}

// dialAndPump conecta una vez y bombea mensajes hasta error/cierre.
// Devuelve true si llegó a establecer la conexión.
func dialAndPump(ctx context.Context, cfg WSConfig, buf *Buffer) bool {
	conn, _, err := websocket.DefaultDialer.DialContext(ctx, cfg.URL, nil)
	if err != nil {
		cfg.Logf("ws dial %s: %v", cfg.URL, err)
		return false
	}
	defer conn.Close()
	cfg.Logf("ws conectado a %s", cfg.URL)

	go func() {
		<-ctx.Done()
		_ = conn.Close()
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			cfg.Logf("ws read: %v", err)
			return true
		}
		if len(msg) == 0 {
			continue
		}
		buf.Push(json.RawMessage(msg))
	}
}
