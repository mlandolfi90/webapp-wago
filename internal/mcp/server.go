package mcp

import (
	"context"
	"encoding/json"
)

// ProtocolVersion is the MCP revision this server speaks.
const ProtocolVersion = "2024-11-05"

// Tool is one callable capability exposed to the MCP client.
type Tool struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"inputSchema"`
	// Handler runs the tool. It returns human/JSON text for the model.
	Handler func(ctx context.Context, args map[string]any) (string, error) `json:"-"`
}

// Server holds the tool registry and serves MCP requests. Transport
// agnostic: stdio.go and http.go feed it raw JSON-RPC.
type Server struct {
	name    string
	version string
	tools   []Tool
	index   map[string]Tool
}

// NewServer builds a server from a tool list.
func NewServer(name, version string, tools []Tool) *Server {
	idx := make(map[string]Tool, len(tools))
	for _, t := range tools {
		idx[t.Name] = t
	}
	return &Server{name: name, version: version, tools: tools, index: idx}
}

// Handle dispatches a single JSON-RPC request. Returns nil for
// notifications (no response expected).
func (s *Server) Handle(ctx context.Context, req *Request) *Response {
	switch req.Method {
	case "initialize":
		return ok(req.ID, map[string]any{
			"protocolVersion": ProtocolVersion,
			"capabilities":    map[string]any{"tools": map[string]any{}},
			"serverInfo":      map[string]any{"name": s.name, "version": s.version},
		})
	case "notifications/initialized", "initialized":
		return nil // notification
	case "ping":
		return ok(req.ID, map[string]any{})
	case "tools/list":
		return ok(req.ID, map[string]any{"tools": s.tools})
	case "tools/call":
		return s.callTool(ctx, req)
	default:
		if len(req.ID) == 0 {
			return nil // unknown notification: ignore
		}
		return fail(req.ID, codeMethodNotFound, "método no soportado: "+req.Method)
	}
}

func (s *Server) callTool(ctx context.Context, req *Request) *Response {
	var p struct {
		Name      string         `json:"name"`
		Arguments map[string]any `json:"arguments"`
	}
	if err := json.Unmarshal(req.Params, &p); err != nil {
		return fail(req.ID, codeInvalidParams, "params inválidos: "+err.Error())
	}
	t, found := s.index[p.Name]
	if !found {
		return fail(req.ID, codeInvalidParams, "tool desconocida: "+p.Name)
	}
	if p.Arguments == nil {
		p.Arguments = map[string]any{}
	}
	text, err := t.Handler(ctx, p.Arguments)
	if err != nil {
		// Tool errors are reported as content with isError, not as a
		// protocol error: the model should see and handle them.
		return ok(req.ID, map[string]any{
			"isError": true,
			"content": []map[string]any{{"type": "text", "text": err.Error()}},
		})
	}
	return ok(req.ID, map[string]any{
		"content": []map[string]any{{"type": "text", "text": text}},
	})
}
