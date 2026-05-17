package mcp

import (
	"context"
	"errors"

	"github.com/webapp-wago/webapp-wago/internal/wago"
)

func messageTools(c *wago.Client) []Tool {
	return []Tool{
		{
			Name:        "wago_react",
			Description: "Reacciona a un mensaje. Args: number, id, reaction (vacío = quitar).",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"id":{"type":"string"},"reaction":{"type":"string"}},"required":["number","id"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				number, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				id, err := reqStr(a, "id")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/message/react", map[string]any{
					"number": number, "id": id, "reaction": str(a, "reaction"),
				}))
			},
		},
		{
			Name:        "wago_mark_read",
			Description: "Marca mensajes como leídos (checks azules). Args: number (chat), id[]. En GRUPOS pasá participant = JID del autor del mensaje (sin él, el receipt no registra en grupos).",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"id":{"type":"array","items":{"type":"string"}},"participant":{"type":"string"}},"required":["number","id"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				number, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				ids := strList(a, "id")
				if len(ids) == 0 {
					return "", errors.New("id debe ser un array no vacío")
				}
				body := map[string]any{"number": number, "id": ids}
				if p := str(a, "participant"); p != "" {
					body["participant"] = p
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/message/markread", body))
			},
		},
		{
			Name:        "wago_message_delete",
			Description: "Borra un mensaje para todos. Args: chat, messageId.",
			InputSchema: schema(`{"type":"object","properties":{"chat":{"type":"string"},"messageId":{"type":"string"}},"required":["chat","messageId"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				chat, err := reqStr(a, "chat")
				if err != nil {
					return "", err
				}
				mid, err := reqStr(a, "messageId")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/message/delete", map[string]any{"chat": chat, "messageId": mid}))
			},
		},
		{
			Name:        "wago_message_edit",
			Description: "Edita el texto de un mensaje. Args: chat, messageId, message.",
			InputSchema: schema(`{"type":"object","properties":{"chat":{"type":"string"},"messageId":{"type":"string"},"message":{"type":"string"}},"required":["chat","messageId","message"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				chat, err := reqStr(a, "chat")
				if err != nil {
					return "", err
				}
				mid, err := reqStr(a, "messageId")
				if err != nil {
					return "", err
				}
				msg, err := reqStr(a, "message")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/message/edit", map[string]any{"chat": chat, "messageId": mid, "message": msg}))
			},
		},
		{
			Name:        "wago_message_status",
			Description: "Estado de entrega/lectura de un mensaje. Args: id.",
			InputSchema: schema(`{"type":"object","properties":{"id":{"type":"string"}},"required":["id"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				id, err := reqStr(a, "id")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/message/status", map[string]any{"id": id}))
			},
		},
		{
			Name:        "wago_download_media",
			Description: "Descarga la media de un mensaje. Args: message (objeto JSON del mensaje).",
			InputSchema: schema(`{"type":"object","properties":{"message":{"type":"object"}},"required":["message"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				m, ok := a["message"].(map[string]any)
				if !ok {
					return "", errors.New("message debe ser un objeto JSON")
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/message/downloadmedia", map[string]any{"message": m}))
			},
		},
	}
}
