package mcp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/webapp-wago/webapp-wago/internal/wago"
)

func schema(s string) json.RawMessage { return json.RawMessage(s) }

func jsonText(v any) string {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Sprintf("%v", v)
	}
	return string(b)
}

func str(args map[string]any, k string) string {
	if v, ok := args[k].(string); ok {
		return v
	}
	return ""
}

func reqStr(args map[string]any, k string) (string, error) {
	v := str(args, k)
	if v == "" {
		return "", fmt.Errorf("falta el argumento requerido %q", k)
	}
	return v, nil
}

func strList(args map[string]any, k string) []string {
	out := []string{}
	if arr, ok := args[k].([]any); ok {
		for _, e := range arr {
			if s, ok := e.(string); ok && s != "" {
				out = append(out, s)
			}
		}
	}
	return out
}

func num(args map[string]any, k string) (float64, bool) {
	switch v := args[k].(type) {
	case float64:
		return v, true
	case json.Number:
		f, err := v.Float64()
		return f, err == nil
	}
	return 0, false
}

// BuildTools returns the core MCP tool catalog bound to a wago client.
// Admin tools use GLOBAL_API_KEY; the rest use the active instance token.
func BuildTools(c *wago.Client) []Tool {
	return []Tool{
		{
			Name:        "wago_instance_create",
			Description: "Crea una instancia de WhatsApp (admin). Args: name, token.",
			InputSchema: schema(`{"type":"object","properties":{"name":{"type":"string"},"token":{"type":"string"}},"required":["name","token"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				name, err := reqStr(a, "name")
				if err != nil {
					return "", err
				}
				token, err := reqStr(a, "token")
				if err != nil {
					return "", err
				}
				r, err := c.Do(ctx, wago.Admin, "POST", "/instance/create", map[string]any{"name": name, "token": token})
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
		{
			Name:        "wago_instance_list",
			Description: "Lista todas las instancias (admin).",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				r, err := c.Do(ctx, wago.Admin, "GET", "/instance/all", nil)
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
		{
			Name:        "wago_use_instance",
			Description: "Fija la instancia activa para las siguientes tools. Args: token (de la instancia).",
			InputSchema: schema(`{"type":"object","properties":{"token":{"type":"string"}},"required":["token"]}`),
			Handler: func(_ context.Context, a map[string]any) (string, error) {
				token, err := reqStr(a, "token")
				if err != nil {
					return "", err
				}
				c.UseInstance(token)
				return "instancia activa fijada", nil
			},
		},
		{
			Name:        "wago_connect",
			Description: "Conecta la instancia activa. Args opcionales: webhookUrl, subscribe (array).",
			InputSchema: schema(`{"type":"object","properties":{"webhookUrl":{"type":"string"},"subscribe":{"type":"array","items":{"type":"string"}}}}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				body := map[string]any{}
				if w := str(a, "webhookUrl"); w != "" {
					body["webhookUrl"] = w
				}
				if s := strList(a, "subscribe"); len(s) > 0 {
					body["subscribe"] = s
				}
				r, err := c.Do(ctx, wago.Instance, "POST", "/instance/connect", body)
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
		{
			Name:        "wago_qr",
			Description: "Obtiene el QR de la instancia activa para vincular.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				r, err := c.Do(ctx, wago.Instance, "GET", "/instance/qr", nil)
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
		{
			Name:        "wago_status",
			Description: "Estado de conexión de la instancia activa.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				r, err := c.Do(ctx, wago.Instance, "GET", "/instance/status", nil)
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
		{
			Name:        "wago_send_text",
			Description: "Envía un mensaje de texto. Args: number, text.",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"text":{"type":"string"}},"required":["number","text"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				number, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				text, err := reqStr(a, "text")
				if err != nil {
					return "", err
				}
				r, err := c.Do(ctx, wago.Instance, "POST", "/send/text", map[string]any{"number": number, "text": text})
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
		{
			Name:        "wago_send_media",
			Description: "Envía media. Args: number, type (image/video/audio/document), url, caption (opcional).",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"type":{"type":"string"},"url":{"type":"string"},"caption":{"type":"string"}},"required":["number","type","url"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				number, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				typ, err := reqStr(a, "type")
				if err != nil {
					return "", err
				}
				url, err := reqStr(a, "url")
				if err != nil {
					return "", err
				}
				r, err := c.Do(ctx, wago.Instance, "POST", "/send/media", map[string]any{
					"number": number, "type": typ, "url": url, "caption": str(a, "caption"),
				})
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
		{
			Name:        "wago_send_location",
			Description: "Envía una ubicación. Args: number, latitude, longitude, name (opcional), address (opcional).",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"latitude":{"type":"number"},"longitude":{"type":"number"},"name":{"type":"string"},"address":{"type":"string"}},"required":["number","latitude","longitude"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				number, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				lat, ok := num(a, "latitude")
				if !ok {
					return "", errors.New("latitude debe ser número")
				}
				lon, ok := num(a, "longitude")
				if !ok {
					return "", errors.New("longitude debe ser número")
				}
				r, err := c.Do(ctx, wago.Instance, "POST", "/send/location", map[string]any{
					"number": number, "latitude": lat, "longitude": lon,
					"name": str(a, "name"), "address": str(a, "address"),
				})
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
		{
			Name:        "wago_react",
			Description: "Reacciona a un mensaje. Args: number, id (messageId), reaction (emoji; vacío = quitar).",
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
				r, err := c.Do(ctx, wago.Instance, "POST", "/message/react", map[string]any{
					"number": number, "id": id, "reaction": str(a, "reaction"),
				})
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
		{
			Name:        "wago_mark_read",
			Description: "Marca mensajes como leídos. Args: number, id (array de messageId).",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"id":{"type":"array","items":{"type":"string"}}},"required":["number","id"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				number, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				ids := strList(a, "id")
				if len(ids) == 0 {
					return "", errors.New("id debe ser un array no vacío")
				}
				r, err := c.Do(ctx, wago.Instance, "POST", "/message/markread", map[string]any{"number": number, "id": ids})
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
		{
			Name:        "wago_check_user",
			Description: "Verifica si números están en WhatsApp; devuelve JID/LID. Args: number (array).",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"array","items":{"type":"string"}}},"required":["number"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				nums := strList(a, "number")
				if len(nums) == 0 {
					return "", errors.New("number debe ser un array no vacío")
				}
				r, err := c.Do(ctx, wago.Instance, "POST", "/user/check", map[string]any{"number": nums})
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
		{
			Name:        "wago_group_list",
			Description: "Lista los grupos de la instancia activa.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				r, err := c.Do(ctx, wago.Instance, "GET", "/group/list", nil)
				if err != nil {
					return "", err
				}
				return jsonText(r), nil
			},
		},
	}
}
