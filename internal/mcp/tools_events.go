package mcp

import (
	"context"
	"fmt"

	"github.com/webapp-wago/webapp-wago/internal/events"
)

// EventTools exposes the inbound-event buffer to the MCP client. Bundle
// these alongside BuildTools(client) in main.
func EventTools(buf *events.Buffer) []Tool {
	return []Tool{
		{
			Name: "wago_events_poll",
			Description: "Devuelve y CONSUME los eventos entrantes acumulados " +
				"(webhook). Args opcionales: type (filtra por tipo, ej. MESSAGE), " +
				"limit (máx a devolver; 0 = todos).",
			InputSchema: schema(`{"type":"object","properties":{"type":{"type":"string"},"limit":{"type":"number"}}}`),
			Handler: func(_ context.Context, a map[string]any) (string, error) {
				limit := 0
				if v, ok := num(a, "limit"); ok {
					limit = int(v)
				}
				evs := buf.Poll(str(a, "type"), limit)
				return jsonText(map[string]any{
					"count":     len(evs),
					"remaining": buf.Len(),
					"events":    evs,
				}), nil
			},
		},
		{
			Name:        "wago_events_clear",
			Description: "Descarta todos los eventos en buffer. Devuelve cuántos se borraron.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(_ context.Context, _ map[string]any) (string, error) {
				return fmt.Sprintf("%d eventos descartados", buf.Clear()), nil
			},
		},
	}
}
