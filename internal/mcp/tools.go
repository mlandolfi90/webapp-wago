package mcp

import "github.com/webapp-wago/webapp-wago/internal/wago"

// BuildTools returns the full MCP tool catalog bound to a wago client,
// aggregated from per-domain builders. Admin tools use GLOBAL_API_KEY;
// instance-scoped tools use the active token (set via wago_use_instance).
func BuildTools(c *wago.Client) []Tool {
	var all []Tool
	all = append(all, instanceTools(c)...)
	all = append(all, sendTools(c)...)
	all = append(all, messageTools(c)...)
	all = append(all, userTools(c)...)
	all = append(all, groupTools(c)...)
	all = append(all, webhookTools(c)...)
	all = append(all, miscTools(c)...)
	return all
}
