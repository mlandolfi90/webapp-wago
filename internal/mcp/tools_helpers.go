package mcp

import (
	"encoding/json"
	"fmt"
	"net/url"
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

func boolArg(args map[string]any, k string) bool {
	b, _ := args[k].(bool)
	return b
}

func pathEsc(s string) string { return url.PathEscape(s) }

// okJSON compresses the common "return error or JSON text" tail.
func okJSON(r any, err error) (string, error) {
	if err != nil {
		return "", err
	}
	return jsonText(r), nil
}
