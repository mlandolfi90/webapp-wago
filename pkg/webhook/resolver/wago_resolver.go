// Package webhook_resolver implementa la interface
// webhook_service.NameResolver contra clients whatsmeow ya vivos.
// Vive en su propio paquete para no crear ciclo (whatsmeow_service
// depende de webhook_service vía Dispatch; el resolver sólo usa la
// API pública de whatsmeow + el clientPointer map).
package webhook_resolver

import (
	"context"

	"go.mau.fi/whatsmeow"
	webhook_service "github.com/webapp-wago/webapp-wago/pkg/webhook/service"
)

type wagoResolver struct {
	clientPointer map[string]*whatsmeow.Client
}

// NewWagoResolver implementa NameResolver leyendo del clientPointer
// compartido (mismo map que whatsmeowService usa internamente).
func NewWagoResolver(clientPointer map[string]*whatsmeow.Client) webhook_service.NameResolver {
	return &wagoResolver{clientPointer: clientPointer}
}

func (r *wagoResolver) GroupNames(ctx context.Context, instanceID string) (map[string]string, error) {
	c, ok := r.clientPointer[instanceID]
	if !ok || c == nil || !c.IsConnected() {
		return map[string]string{}, nil
	}
	groups, err := c.GetJoinedGroups(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[string]string, len(groups))
	for _, g := range groups {
		name := g.GroupName.Name
		if name == "" {
			continue
		}
		out[g.JID.String()] = name
	}
	return out, nil
}

func (r *wagoResolver) ContactNames(ctx context.Context, instanceID string) (map[string]string, error) {
	c, ok := r.clientPointer[instanceID]
	if !ok || c == nil || c.Store == nil || c.Store.Contacts == nil {
		return map[string]string{}, nil
	}
	contacts, err := c.Store.Contacts.GetAllContacts(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[string]string, len(contacts))
	for jid, info := range contacts {
		name := info.FullName
		if name == "" {
			name = info.PushName
		}
		if name == "" {
			name = info.BusinessName
		}
		if name == "" {
			continue
		}
		out[jid.String()] = name
	}
	return out, nil
}
