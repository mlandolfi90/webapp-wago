package events

import (
	"io"
	"net/http"
)

// Handler returns an http.Handler that accepts webhook deliveries
// (POST, JSON body) and pushes them into buf. Mount it at /webhook and
// register that URL via the wago_connect tool's webhookUrl argument.
func Handler(buf *Buffer) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 8<<20))
		_ = r.Body.Close()
		if err != nil || len(body) == 0 {
			http.Error(w, "empty body", http.StatusBadRequest)
			return
		}
		buf.Push(body)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
}
