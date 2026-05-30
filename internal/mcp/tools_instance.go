package mcp

import (
	"context"

	"github.com/webapp-wago/webapp-wago/internal/wago"
)

func instanceTools(c *wago.Client) []Tool {
	return []Tool{
		{
			Name:        "wago_instance_create",
			Description: "Crea una instancia (admin). Args: name, token.",
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
				return okJSON(c.Do(ctx, wago.Admin, "POST", "/instance/create", map[string]any{"name": name, "token": token}))
			},
		},
		{
			Name:        "wago_instance_list",
			Description: "Lista todas las instancias (admin).",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Admin, "GET", "/instance/all", nil))
			},
		},
		{
			Name:        "wago_instance_delete",
			Description: "Borra una instancia (admin). Args: instanceId.",
			InputSchema: schema(`{"type":"object","properties":{"instanceId":{"type":"string"}},"required":["instanceId"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				id, err := reqStr(a, "instanceId")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Admin, "DELETE", "/instance/delete/"+pathEsc(id), nil))
			},
		},
		{
			Name:        "wago_proxy_set",
			Description: "Configura proxy de una instancia (admin). Args: instanceId, host, port, username?, password?.",
			InputSchema: schema(`{"type":"object","properties":{"instanceId":{"type":"string"},"host":{"type":"string"},"port":{"type":"string"},"username":{"type":"string"},"password":{"type":"string"}},"required":["instanceId","host","port"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				id, err := reqStr(a, "instanceId")
				if err != nil {
					return "", err
				}
				host, err := reqStr(a, "host")
				if err != nil {
					return "", err
				}
				port, err := reqStr(a, "port")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Admin, "POST", "/instance/proxy/"+pathEsc(id), map[string]any{
					"host": host, "port": port, "username": str(a, "username"), "password": str(a, "password"),
				}))
			},
		},
		{
			Name:        "wago_proxy_delete",
			Description: "Quita el proxy de una instancia (admin). Args: instanceId.",
			InputSchema: schema(`{"type":"object","properties":{"instanceId":{"type":"string"}},"required":["instanceId"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				id, err := reqStr(a, "instanceId")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Admin, "DELETE", "/instance/proxy/"+pathEsc(id), nil))
			},
		},
		{
			Name:        "wago_use_instance",
			Description: "Fija la instancia activa para las tools instance-scoped. Args: token.",
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
			Description: "Conecta la instancia activa. Args opcionales: webhookUrl, subscribe[].",
			InputSchema: schema(`{"type":"object","properties":{"webhookUrl":{"type":"string"},"subscribe":{"type":"array","items":{"type":"string"}}}}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				body := map[string]any{}
				if w := str(a, "webhookUrl"); w != "" {
					body["webhookUrl"] = w
				}
				if s := strList(a, "subscribe"); len(s) > 0 {
					body["subscribe"] = s
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/instance/connect", body))
			},
		},
		{
			Name:        "wago_qr",
			Description: "QR de la instancia activa para vincular.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "GET", "/instance/qr", nil))
			},
		},
		{
			Name:        "wago_pair",
			Description: "Solicita código de emparejamiento. Args: phone.",
			InputSchema: schema(`{"type":"object","properties":{"phone":{"type":"string"}},"required":["phone"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				phone, err := reqStr(a, "phone")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/instance/pair", map[string]any{"phone": phone}))
			},
		},
		{
			Name:        "wago_status",
			Description: "Estado de conexión de la instancia activa.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "GET", "/instance/status", nil))
			},
		},
		{
			Name:        "wago_disconnect",
			Description: "Desconecta la instancia activa (mantiene sesión).",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/instance/disconnect", nil))
			},
		},
		{
			Name:        "wago_reconnect",
			Description: "Reconecta la instancia activa.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/instance/reconnect", nil))
			},
		},
		{
			Name:        "wago_logout",
			Description: "Cierra sesión de la instancia activa (desvincula).",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "DELETE", "/instance/logout", nil))
			},
		},
		{
			Name:        "wago_advanced_get",
			Description: "Lee ajustes avanzados. Args: instanceId.",
			InputSchema: schema(`{"type":"object","properties":{"instanceId":{"type":"string"}},"required":["instanceId"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				id, err := reqStr(a, "instanceId")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "GET", "/instance/"+pathEsc(id)+"/advanced-settings", nil))
			},
		},
		{
			Name: "wago_advanced_set",
			// WAGO-PATCH(ADR-0049): +ignoreFromMe (default true en backend;
			// pasarlo explícito si quieren auditar salientes).
			Description: "Actualiza ajustes avanzados. Args: instanceId, alwaysOnline?, rejectCall?, readMessages?, ignoreGroups?, ignoreStatus?, ignoreFromMe? (default true: ignora mensajes propios para romper loops webhook→/send/text), msgRejectCall?.",
			InputSchema: schema(`{"type":"object","properties":{"instanceId":{"type":"string"},"alwaysOnline":{"type":"boolean"},"rejectCall":{"type":"boolean"},"readMessages":{"type":"boolean"},"ignoreGroups":{"type":"boolean"},"ignoreStatus":{"type":"boolean"},"ignoreFromMe":{"type":"boolean"},"msgRejectCall":{"type":"string"}},"required":["instanceId"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				id, err := reqStr(a, "instanceId")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "PUT", "/instance/"+pathEsc(id)+"/advanced-settings", map[string]any{
					"alwaysOnline": boolArg(a, "alwaysOnline"), "rejectCall": boolArg(a, "rejectCall"),
					"readMessages": boolArg(a, "readMessages"), "ignoreGroups": boolArg(a, "ignoreGroups"),
					"ignoreStatus": boolArg(a, "ignoreStatus"),
					// WAGO-PATCH(ADR-0049): default true cuando ausente.
					"ignoreFromMe":  boolArgOr(a, "ignoreFromMe", true),
					"msgRejectCall": str(a, "msgRejectCall"),
				}))
			},
		},
	}
}
