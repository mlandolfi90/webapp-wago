// Command mcp is the WhatsApp MCP server: it wraps the webapp-wago REST
// API and exposes it as Model Context Protocol tools.
//
// Config (env):
//
//	WAGO_BASE_URL   base URL of the REST API (default http://localhost:8080)
//	WAGO_ADMIN_KEY  GLOBAL_API_KEY (admin scope; required for admin tools)
//	MCP_TRANSPORT   "stdio" (default) or "http"
//	MCP_HTTP_ADDR   listen addr for http transport (default :8089)
//
// Credentials live here, never in tool arguments (except wago_use_instance,
// which sets the active instance token explicitly).
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

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

	client := wago.New(base, admin)
	srv := mcp.NewServer("wago-whatsapp", "1.0.0", mcp.BuildTools(client))

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	switch transport {
	case "http":
		log.Printf("MCP http en %s (API %s)", addr, base)
		if err := srv.Serve(ctx, addr); err != nil {
			log.Fatalf("mcp http: %v", err)
		}
	case "stdio":
		if err := srv.ServeStdio(ctx, os.Stdin, os.Stdout); err != nil {
			log.Fatalf("mcp stdio: %v", err)
		}
	default:
		log.Fatalf("MCP_TRANSPORT desconocido: %q (usá stdio|http)", transport)
	}
}
