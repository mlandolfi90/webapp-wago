package mcp

import (
	"context"
	"errors"

	"github.com/webapp-wago/webapp-wago/internal/wago"
)

func sendTools(c *wago.Client) []Tool {
	return []Tool{
		{
			Name:        "wago_send_text",
			Description: "Envía texto. Args: number, text.",
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
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/send/text", map[string]any{"number": number, "text": text}))
			},
		},
		{
			Name:        "wago_send_media",
			Description: "Envía media. Args: number, type (image/video/audio/document), url, caption?.",
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
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/send/media", map[string]any{
					"number": number, "type": typ, "url": url, "caption": str(a, "caption"),
				}))
			},
		},
		{
			Name:        "wago_send_link",
			Description: "Envía un link con vista previa. Args: number, url, text?, title?, description?, imgUrl?.",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"url":{"type":"string"},"text":{"type":"string"},"title":{"type":"string"},"description":{"type":"string"},"imgUrl":{"type":"string"}},"required":["number","url"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				number, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				u, err := reqStr(a, "url")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/send/link", map[string]any{
					"number": number, "url": u, "text": str(a, "text"),
					"title": str(a, "title"), "description": str(a, "description"), "imgUrl": str(a, "imgUrl"),
				}))
			},
		},
		{
			Name:        "wago_send_location",
			Description: "Envía ubicación. Args: number, latitude, longitude, name?, address?.",
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
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/send/location", map[string]any{
					"number": number, "latitude": lat, "longitude": lon,
					"name": str(a, "name"), "address": str(a, "address"),
				}))
			},
		},
		{
			Name:        "wago_send_poll",
			Description: "Envía una encuesta. Args: number, question, options[], maxAnswer?.",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"question":{"type":"string"},"options":{"type":"array","items":{"type":"string"}},"maxAnswer":{"type":"number"}},"required":["number","question","options"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				number, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				q, err := reqStr(a, "question")
				if err != nil {
					return "", err
				}
				opts := strList(a, "options")
				if len(opts) < 2 {
					return "", errors.New("options debe tener al menos 2 entradas")
				}
				maxA := 1.0
				if v, ok := num(a, "maxAnswer"); ok {
					maxA = v
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/send/poll", map[string]any{
					"number": number, "question": q, "options": opts, "maxAnswer": maxA,
				}))
			},
		},
		{
			Name:        "wago_send_contact",
			Description: "Envía un contacto (vCard). Args: number, fullName, phone, organization?.",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"fullName":{"type":"string"},"phone":{"type":"string"},"organization":{"type":"string"}},"required":["number","fullName","phone"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				number, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				fn, err := reqStr(a, "fullName")
				if err != nil {
					return "", err
				}
				ph, err := reqStr(a, "phone")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/send/contact", map[string]any{
					"number": number,
					"vcard":  map[string]any{"fullName": fn, "phone": ph, "organization": str(a, "organization")},
				}))
			},
		},
		{
			Name:        "wago_send_sticker",
			Description: "Envía un sticker. Args: number, sticker (URL o base64).",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"sticker":{"type":"string"}},"required":["number","sticker"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				number, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				st, err := reqStr(a, "sticker")
				if err != nil {
					return "", err
				}
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/send/sticker", map[string]any{"number": number, "sticker": st}))
			},
		},
	}
}
