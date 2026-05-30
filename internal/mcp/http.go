package mcp

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

// HTTPHandler exposes the MCP server over HTTP (Streamable-HTTP style):
//   - POST /mcp : a JSON-RPC request, JSON-RPC response in the body.
//   - GET  /mcp : an SSE stream for server→client messages (keep-alive).
//
// Single endpoint path, method-dispatched. Suitable for one logical
// session per connection; multi-session fan-out is out of scope here.
func (s *Server) HTTPHandler() http.Handler { return s.mux(nil) }

// mux builds the base routes (/mcp, /healthz) plus any extra handlers
// (e.g. /webhook), so the webhook receiver can share the MCP port.
func (s *Server) mux(extra map[string]http.Handler) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/mcp", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			s.httpPost(w, r)
		case http.MethodGet:
			s.httpSSE(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	for path, h := range extra {
		mux.Handle(path, h)
	}
	return mux
}

func (s *Server) httpPost(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, fail(nil, codeParseError, "JSON inválido"))
		return
	}
	resp := s.Handle(r.Context(), &req)
	if resp == nil {
		w.WriteHeader(http.StatusAccepted) // notification, no body
		return
	}
	writeJSON(w, resp)
}

func (s *Server) httpSSE(w http.ResponseWriter, r *http.Request) {
	fl, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	ctx := r.Context()
	tick := time.NewTicker(25 * time.Second)
	defer tick.Stop()
	// This server is request/response only; the stream stays open with
	// periodic comments so clients that require an SSE channel keep it.
	_, _ = w.Write([]byte(": connected\n\n"))
	fl.Flush()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			if _, err := w.Write([]byte(": keep-alive\n\n")); err != nil {
				return
			}
			fl.Flush()
		}
	}
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

// Serve runs the HTTP transport on addr until ctx is done.
func (s *Server) Serve(ctx context.Context, addr string) error {
	return s.ServeWith(ctx, addr, nil)
}

// ServeWith is Serve plus extra HTTP routes (e.g. the webhook receiver)
// mounted on the same listener.
func (s *Server) ServeWith(ctx context.Context, addr string, extra map[string]http.Handler) error {
	srv := &http.Server{Addr: addr, Handler: s.mux(extra)}
	go func() {
		<-ctx.Done()
		sc, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = srv.Shutdown(sc)
	}()
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}
