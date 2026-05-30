package mcp

import (
	"context"
	"errors"

	"github.com/webapp-wago/webapp-wago/internal/wago"
)

func miscTools(c *wago.Client) []Tool {
	return []Tool{
		{
			Name:        "wago_community_create",
			Description: "Crea una comunidad. Args: communityName.",
			InputSchema: schema(`{"type":"object","properties":{"communityName":{"type":"string"}},"required":["communityName"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				n, err := reqStr(a, "communityName")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/community/create", map[string]any{"communityName": n}))
			},
		},
		{
			Name:        "wago_community_add",
			Description: "Agrega grupos a una comunidad. Args: communityJid, groupJid[].",
			InputSchema: schema(`{"type":"object","properties":{"communityJid":{"type":"string"},"groupJid":{"type":"array","items":{"type":"string"}}},"required":["communityJid","groupJid"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				cj, err := reqStr(a, "communityJid")
				if err != nil {
					return "", err
				}
				gs := strList(a, "groupJid")
				if len(gs) == 0 {
					return "", errors.New("groupJid debe ser un array no vacío")
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/community/add", map[string]any{"communityJid": cj, "groupJid": gs}))
			},
		},
		{
			Name:        "wago_community_remove",
			Description: "Quita grupos de una comunidad. Args: communityJid, groupJid[].",
			InputSchema: schema(`{"type":"object","properties":{"communityJid":{"type":"string"},"groupJid":{"type":"array","items":{"type":"string"}}},"required":["communityJid","groupJid"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				cj, err := reqStr(a, "communityJid")
				if err != nil {
					return "", err
				}
				gs := strList(a, "groupJid")
				if len(gs) == 0 {
					return "", errors.New("groupJid debe ser un array no vacío")
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/community/remove", map[string]any{"communityJid": cj, "groupJid": gs}))
			},
		},
		{
			Name:        "wago_labels_list",
			Description: "Lista las etiquetas.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "GET", "/label", nil))
			},
		},
		{
			Name:        "wago_label_chat",
			Description: "Etiqueta/desetiqueta un chat. Args: jid, labelId, remove? (true = quitar).",
			InputSchema: schema(`{"type":"object","properties":{"jid":{"type":"string"},"labelId":{"type":"string"},"remove":{"type":"boolean"}},"required":["jid","labelId"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				j, err := reqStr(a, "jid")
				if err != nil {
					return "", err
				}
				l, err := reqStr(a, "labelId")
				if err != nil {
					return "", err
				}
				path := "/label/chat"
				if boolArg(a, "remove") {
					path = "/unlabel/chat"
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", path, map[string]any{"jid": j, "labelId": l}))
			},
		},
		{
			Name:        "wago_label_message",
			Description: "Etiqueta/desetiqueta un mensaje. Args: jid, labelId, messageId, remove?.",
			InputSchema: schema(`{"type":"object","properties":{"jid":{"type":"string"},"labelId":{"type":"string"},"messageId":{"type":"string"},"remove":{"type":"boolean"}},"required":["jid","labelId","messageId"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				j, err := reqStr(a, "jid")
				if err != nil {
					return "", err
				}
				l, err := reqStr(a, "labelId")
				if err != nil {
					return "", err
				}
				mid, err := reqStr(a, "messageId")
				if err != nil {
					return "", err
				}
				path := "/label/message"
				if boolArg(a, "remove") {
					path = "/unlabel/message"
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", path, map[string]any{"jid": j, "labelId": l, "messageId": mid}))
			},
		},
		{
			Name:        "wago_label_edit",
			Description: "Crea/edita/borra una etiqueta. Args: labelId?, name?, color?, deleted?.",
			InputSchema: schema(`{"type":"object","properties":{"labelId":{"type":"string"},"name":{"type":"string"},"color":{"type":"number"},"deleted":{"type":"boolean"}}}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				color := 0.0
				if v, ok := num(a, "color"); ok {
					color = v
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/label/edit", map[string]any{
					"labelId": str(a, "labelId"), "name": str(a, "name"),
					"color": color, "deleted": boolArg(a, "deleted"),
				}))
			},
		},
		{
			Name:        "wago_newsletter_create",
			Description: "Crea un canal. Args: name, description?.",
			InputSchema: schema(`{"type":"object","properties":{"name":{"type":"string"},"description":{"type":"string"}},"required":["name"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				n, err := reqStr(a, "name")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/newsletter/create", map[string]any{"name": n, "description": str(a, "description")}))
			},
		},
		{
			Name:        "wago_newsletter_list",
			Description: "Lista los canales.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "GET", "/newsletter/list", nil))
			},
		},
		{
			Name:        "wago_newsletter_info",
			Description: "Info de un canal. Args: jid.",
			InputSchema: schema(`{"type":"object","properties":{"jid":{"type":"string"}},"required":["jid"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				j, err := reqStr(a, "jid")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/newsletter/info", map[string]any{"jid": j}))
			},
		},
		{
			Name:        "wago_newsletter_link",
			Description: "Resuelve una invitación de canal. Args: key.",
			InputSchema: schema(`{"type":"object","properties":{"key":{"type":"string"}},"required":["key"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				k, err := reqStr(a, "key")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/newsletter/link", map[string]any{"key": k}))
			},
		},
		{
			Name:        "wago_newsletter_subscribe",
			Description: "Se suscribe a un canal. Args: jid.",
			InputSchema: schema(`{"type":"object","properties":{"jid":{"type":"string"}},"required":["jid"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				j, err := reqStr(a, "jid")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/newsletter/subscribe", map[string]any{"jid": j}))
			},
		},
		{
			Name:        "wago_newsletter_messages",
			Description: "Mensajes de un canal. Args: jid, count?, before_id?.",
			InputSchema: schema(`{"type":"object","properties":{"jid":{"type":"string"},"count":{"type":"number"},"before_id":{"type":"number"}},"required":["jid"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				j, err := reqStr(a, "jid")
				if err != nil {
					return "", err
				}
				body := map[string]any{"jid": j}
				if v, ok := num(a, "count"); ok {
					body["count"] = v
				}
				if v, ok := num(a, "before_id"); ok {
					body["before_id"] = v
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/newsletter/messages", body))
			},
		},
		{
			Name:        "wago_poll_results",
			Description: "Resultados de una encuesta. Args: pollMessageId.",
			InputSchema: schema(`{"type":"object","properties":{"pollMessageId":{"type":"string"}},"required":["pollMessageId"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				id, err := reqStr(a, "pollMessageId")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "GET", "/polls/"+pathEsc(id)+"/results", nil))
			},
		},
		{
			Name:        "wago_call_reject",
			Description: "Rechaza una llamada entrante. Args: callId, callCreator.",
			InputSchema: schema(`{"type":"object","properties":{"callId":{"type":"string"},"callCreator":{"type":"string"}},"required":["callId","callCreator"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				cid, err := reqStr(a, "callId")
				if err != nil {
					return "", err
				}
				cc, err := reqStr(a, "callCreator")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/call/reject", map[string]any{"callId": cid, "callCreator": cc}))
			},
		},
	}
}
