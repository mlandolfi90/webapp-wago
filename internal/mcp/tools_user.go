package mcp

import (
	"context"
	"errors"

	"github.com/webapp-wago/webapp-wago/internal/wago"
)

func userTools(c *wago.Client) []Tool {
	return []Tool{
		{
			Name:        "wago_check_user",
			Description: "Verifica si números están en WhatsApp; devuelve JID/LID. Args: number[].",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"array","items":{"type":"string"}}},"required":["number"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				nums := strList(a, "number")
				if len(nums) == 0 {
					return "", errors.New("number debe ser un array no vacío")
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/user/check", map[string]any{"number": nums}))
			},
		},
		{
			Name:        "wago_user_info",
			Description: "Info detallada de usuarios (incluye LID). Args: number[].",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"array","items":{"type":"string"}}},"required":["number"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				nums := strList(a, "number")
				if len(nums) == 0 {
					return "", errors.New("number debe ser un array no vacío")
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/user/info", map[string]any{"number": nums}))
			},
		},
		{
			Name:        "wago_user_avatar",
			Description: "Foto de perfil de un número. Args: number, preview?.",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"preview":{"type":"boolean"}},"required":["number"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				n, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/user/avatar", map[string]any{"number": n, "preview": boolArg(a, "preview")}))
			},
		},
		{
			Name:        "wago_contacts",
			Description: "Lista los contactos de la instancia activa.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "GET", "/user/contacts", nil))
			},
		},
		{
			Name:        "wago_blocklist",
			Description: "Lista los contactos bloqueados.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "GET", "/user/blocklist", nil))
			},
		},
		{
			Name:        "wago_block",
			Description: "Bloquea un número. Args: number.",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"}},"required":["number"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				n, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/user/block", map[string]any{"number": n}))
			},
		},
		{
			Name:        "wago_unblock",
			Description: "Desbloquea un número. Args: number.",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"}},"required":["number"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				n, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/user/unblock", map[string]any{"number": n}))
			},
		},
		{
			Name:        "wago_privacy_get",
			Description: "Lee la configuración de privacidad.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "GET", "/user/privacy", nil))
			},
		},
		{
			Name:        "wago_privacy_set",
			Description: "Actualiza privacidad. Args (PrivacySetting): lastSeen?, online?, profile?, status?, readReceipts?, groupAdd?, callAdd?.",
			InputSchema: schema(`{"type":"object","properties":{"lastSeen":{"type":"string"},"online":{"type":"string"},"profile":{"type":"string"},"status":{"type":"string"},"readReceipts":{"type":"string"},"groupAdd":{"type":"string"},"callAdd":{"type":"string"}}}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				body := map[string]any{}
				for _, k := range []string{"lastSeen", "online", "profile", "status", "readReceipts", "groupAdd", "callAdd"} {
					if v := str(a, k); v != "" {
						body[k] = v
					}
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/user/privacy", body))
			},
		},
		{
			Name:        "wago_profile_name",
			Description: "Cambia el nombre de perfil. Args: value.",
			InputSchema: schema(`{"type":"object","properties":{"value":{"type":"string"}},"required":["value"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				v, err := reqStr(a, "value")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/user/profileName", map[string]any{"name": v}))
			},
		},
		{
			Name:        "wago_profile_status",
			Description: "Cambia el mensaje de estado. Args: value.",
			InputSchema: schema(`{"type":"object","properties":{"value":{"type":"string"}},"required":["value"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				v, err := reqStr(a, "value")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/user/profileStatus", map[string]any{"status": v}))
			},
		},
		{
			Name:        "wago_profile_picture",
			Description: "Cambia la foto de perfil. Args: image (URL o base64).",
			InputSchema: schema(`{"type":"object","properties":{"image":{"type":"string"}},"required":["image"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				v, err := reqStr(a, "image")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/user/profilePicture", map[string]any{"image": v}))
			},
		},
	}
}
