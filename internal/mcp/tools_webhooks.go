package mcp

import (
	"context"
	"errors"

	"github.com/webapp-wago/webapp-wago/internal/wago"
)

func webhookTools(c *wago.Client) []Tool {
	return []Tool{
		{
			Name:        "wago_webhooks_list",
			Description: "Lista los webhooks múltiples (con filtro inline) configurados en la instancia activa.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "GET", "/webhook", nil))
			},
		},
		{
			Name: "wago_webhook_create",
			// WAGO-PATCH(ADR-0049): +ignoreFromMe (default true en backend).
			Description: "Crea un webhook con filtro inline. Args: url (http/https obligatoria), " +
				"enabled?, events? (lista; vacío o ALL = todos), chatType? (any|group|individual), " +
				"chatIds? (JIDs o globs), senders? (JIDs o globs), " +
				"chatNames? (globs sobre nombre del grupo, ej Harness*), " +
				"senderNames? (globs sobre nombre del contacto, ej Mauro*), " +
				"ignoreFromMe? (default true: ignora mensajes propios para romper loops webhook→/send/text; pasar false solo si querés auditar salientes).",
			InputSchema: schema(`{"type":"object","properties":{"url":{"type":"string"},"enabled":{"type":"boolean"},"events":{"type":"array","items":{"type":"string"}},"chatType":{"type":"string","enum":["any","group","individual"]},"chatIds":{"type":"array","items":{"type":"string"}},"senders":{"type":"array","items":{"type":"string"}},"chatNames":{"type":"array","items":{"type":"string"}},"senderNames":{"type":"array","items":{"type":"string"}},"ignoreFromMe":{"type":"boolean"}},"required":["url"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				url, err := reqStr(a, "url")
				if err != nil {
					return "", err
				}
				body := buildWebhookBody(a, url)
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/webhook", body))
			},
		},
		{
			Name:        "wago_webhook_update",
			Description: "Actualiza un webhook por id (los campos no presentes se vacían: pasá los que quieras conservar). ignoreFromMe ausente = default true (WAGO-PATCH ADR-0049).",
			InputSchema: schema(`{"type":"object","properties":{"id":{"type":"string"},"url":{"type":"string"},"enabled":{"type":"boolean"},"events":{"type":"array","items":{"type":"string"}},"chatType":{"type":"string","enum":["any","group","individual"]},"chatIds":{"type":"array","items":{"type":"string"}},"senders":{"type":"array","items":{"type":"string"}},"chatNames":{"type":"array","items":{"type":"string"}},"senderNames":{"type":"array","items":{"type":"string"}},"ignoreFromMe":{"type":"boolean"}},"required":["id","url"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				id, err := reqStr(a, "id")
				if err != nil {
					return "", err
				}
				url, err := reqStr(a, "url")
				if err != nil {
					return "", err
				}
				body := buildWebhookBody(a, url)
				return okJSON(c.Do(ctx, wago.Instance, "PUT", "/webhook/"+pathEsc(id), body))
			},
		},
		{
			Name:        "wago_webhook_delete",
			Description: "Borra un webhook por id.",
			InputSchema: schema(`{"type":"object","properties":{"id":{"type":"string"}},"required":["id"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				id, err := reqStr(a, "id")
				if err != nil {
					return "", err
				}
				if id == "" {
					return "", errors.New("id requerido")
				}
				return okJSON(c.Do(ctx, wago.Instance, "DELETE", "/webhook/"+pathEsc(id), nil))
			},
		},
	}
}

func buildWebhookBody(a map[string]any, url string) map[string]any {
	body := map[string]any{"url": url}
	if v, ok := a["enabled"].(bool); ok {
		body["enabled"] = v
	}
	if v := strList(a, "events"); len(v) > 0 {
		body["events"] = v
	}
	if v := str(a, "chatType"); v != "" {
		body["chatType"] = v
	}
	if v := strList(a, "chatIds"); len(v) > 0 {
		body["chatIds"] = v
	}
	if v := strList(a, "senders"); len(v) > 0 {
		body["senders"] = v
	}
	if v := strList(a, "chatNames"); len(v) > 0 {
		body["chatNames"] = v
	}
	if v := strList(a, "senderNames"); len(v) > 0 {
		body["senderNames"] = v
	}
	// WAGO-PATCH(ADR-0049): solo lo agrego si fue explícito — ausente
	// deja que el backend aplique su default (true).
	if v, ok := a["ignoreFromMe"].(bool); ok {
		body["ignoreFromMe"] = v
	}
	return body
}
