package mcp

import (
	"context"
	"errors"

	"github.com/webapp-wago/webapp-wago/internal/wago"
)

func groupTools(c *wago.Client) []Tool {
	return []Tool{
		{
			Name:        "wago_group_list",
			Description: "Lista los grupos de la instancia activa.",
			InputSchema: schema(`{"type":"object","properties":{}}`),
			Handler: func(ctx context.Context, _ map[string]any) (string, error) {
				return okJSON(c.Do(ctx, wago.Instance, "GET", "/group/list", nil))
			},
		},
		{
			Name:        "wago_group_info",
			Description: "Info de un grupo. Args: groupJid.",
			InputSchema: schema(`{"type":"object","properties":{"groupJid":{"type":"string"}},"required":["groupJid"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				g, err := reqStr(a, "groupJid")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/group/info", map[string]any{"groupJid": g}))
			},
		},
		{
			Name:        "wago_group_invite_link",
			Description: "Link de invitación de un grupo. Args: groupJid, reset?.",
			InputSchema: schema(`{"type":"object","properties":{"groupJid":{"type":"string"},"reset":{"type":"boolean"}},"required":["groupJid"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				g, err := reqStr(a, "groupJid")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/group/invitelink", map[string]any{"groupJid": g, "reset": boolArg(a, "reset")}))
			},
		},
		{
			Name:        "wago_group_create",
			Description: "Crea un grupo. Args: groupName, participants[].",
			InputSchema: schema(`{"type":"object","properties":{"groupName":{"type":"string"},"participants":{"type":"array","items":{"type":"string"}}},"required":["groupName","participants"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				gn, err := reqStr(a, "groupName")
				if err != nil {
					return "", err
				}
				ps := strList(a, "participants")
				if len(ps) == 0 {
					return "", errors.New("participants debe ser un array no vacío")
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/group/create", map[string]any{"groupName": gn, "participants": ps}))
			},
		},
		{
			Name:        "wago_group_participant",
			Description: "Gestiona participantes. Args: groupJid, action (add/remove/promote/demote), participants[].",
			InputSchema: schema(`{"type":"object","properties":{"groupJid":{"type":"string"},"action":{"type":"string"},"participants":{"type":"array","items":{"type":"string"}}},"required":["groupJid","action","participants"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				g, err := reqStr(a, "groupJid")
				if err != nil {
					return "", err
				}
				act, err := reqStr(a, "action")
				if err != nil {
					return "", err
				}
				ps := strList(a, "participants")
				if len(ps) == 0 {
					return "", errors.New("participants debe ser un array no vacío")
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/group/participant", map[string]any{"groupJid": g, "action": act, "participants": ps}))
			},
		},
		{
			Name:        "wago_group_name",
			Description: "Renombra un grupo. Args: groupJid, name.",
			InputSchema: schema(`{"type":"object","properties":{"groupJid":{"type":"string"},"name":{"type":"string"}},"required":["groupJid","name"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				g, err := reqStr(a, "groupJid")
				if err != nil {
					return "", err
				}
				n, err := reqStr(a, "name")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/group/name", map[string]any{"groupJid": g, "name": n}))
			},
		},
		{
			Name:        "wago_group_description",
			Description: "Cambia la descripción de un grupo. Args: groupJid, description.",
			InputSchema: schema(`{"type":"object","properties":{"groupJid":{"type":"string"},"description":{"type":"string"}},"required":["groupJid"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				g, err := reqStr(a, "groupJid")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/group/description", map[string]any{"groupJid": g, "description": str(a, "description")}))
			},
		},
		{
			Name:        "wago_group_photo",
			Description: "Cambia la foto de un grupo. Args: groupJid, image (URL o base64).",
			InputSchema: schema(`{"type":"object","properties":{"groupJid":{"type":"string"},"image":{"type":"string"}},"required":["groupJid","image"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				g, err := reqStr(a, "groupJid")
				if err != nil {
					return "", err
				}
				img, err := reqStr(a, "image")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/group/photo", map[string]any{"groupJid": g, "image": img}))
			},
		},
		{
			Name:        "wago_group_join",
			Description: "Se une a un grupo por link/código. Args: code.",
			InputSchema: schema(`{"type":"object","properties":{"code":{"type":"string"}},"required":["code"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				code, err := reqStr(a, "code")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/group/join", map[string]any{"code": code}))
			},
		},
		{
			Name:        "wago_group_leave",
			Description: "Sale de un grupo. Args: groupJid.",
			InputSchema: schema(`{"type":"object","properties":{"groupJid":{"type":"string"}},"required":["groupJid"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				g, err := reqStr(a, "groupJid")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/group/leave", map[string]any{"groupJid": g}))
			},
		},
	}
}
