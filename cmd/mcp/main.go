// Command mcp is the WhatsApp MCP server: it wraps the webapp-wago REST
// API and exposes it as Model Context Protocol tools.
//
// Config (env):
//
//	WAGO_BASE_URL     base URL of the REST API (default http://localhost:8080)
//	WAGO_ADMIN_KEY    GLOBAL_API_KEY (admin scope; required for admin tools)
//	MCP_TRANSPORT     "stdio" (default) or "http"
//	MCP_HTTP_ADDR     listen addr for http transport (default :8089)
//	MCP_WEBHOOK_ADDR  if set under stdio, runs the webhook receiver here
//	                  (e.g. :8090). Under http it shares MCP_HTTP_ADDR.
//	MCP_EVENTS_MAX    inbound event buffer size (default 500)
//
// Inbound events: register the receiver URL (".../webhook") via the
// wago_connect tool's webhookUrl arg; pull them with wago_events_poll.
//
// Credentials live here, never in tool arguments (except wago_use_instance,
// which sets the active instance token explicitly).
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/webapp-wago/webapp-wago/internal/events"
	"github.com/webapp-wago/webapp-wago/internal/mcp"
	"github.com/webapp-wago/webapp-wago/internal/wago"
)

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	base := env("WAGO_BASE_URL", "http://localhost:8080")
	admin := os.Getenv("WAGO_ADMIN_KEY")
	transport := env("MCP_TRANSPORT", "stdio")
	addr := env("MCP_HTTP_ADDR", ":8089")
	webhookAddr := os.Getenv("MCP_WEBHOOK_ADDR")

	maxEv := 500
	if v, err := strconv.Atoi(os.Getenv("MCP_EVENTS_MAX")); err == nil && v > 0 {
		maxEv = v
	}

	client := wago.New(base, admin)
	buf := events.New(maxEv)
	tools := append(mcp.BuildTools(client), mcp.EventTools(buf)...)
	srv := mcp.NewServer("wago-whatsapp", "1.0.0", tools)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	switch transport {
	case "http":
		log.Printf("MCP http en %s (API %s) — webhook en %s/webhook", addr, base, addr)
		extra := map[string]http.Handler{"/webhook": events.Handler(buf)}
		if err := srv.ServeWith(ctx, addr, extra); err != nil {
			log.Fatalf("mcp http: %v", err)
		}
	case "stdio":
		if webhookAddr != "" {
			go runWebhook(ctx, webhookAddr, buf)
		}
		if err := srv.ServeStdio(ctx, os.Stdin, os.Stdout); err != nil {
			log.Fatalf("mcp stdio: %v", err)
		}
	default:
		log.Fatalf("MCP_TRANSPORT desconocido: %q (usá stdio|http)", transport)
	}
}

func runWebhook(ctx context.Context, addr string, buf *events.Buffer) {
	mux := http.NewServeMux()
	mux.Handle("/webhook", events.Handler(buf))
	hs := &http.Server{Addr: addr, Handler: mux}
	go func() {
		<-ctx.Done()
		sc, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = hs.Shutdown(sc)
	}()
	log.Printf("webhook receiver en %s/webhook", addr)
	if err := hs.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Printf("webhook: %v", err)
	}
}
