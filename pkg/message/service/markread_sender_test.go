package message_service

import (
	"testing"

	"go.mau.fi/whatsmeow/types"
)

func TestResolveReadSender(t *testing.T) {
	chat := types.JID{User: "123", Server: types.GroupServer}

	// Sin participant => sender = chat (DMs / comportamiento histórico).
	got, err := resolveReadSender(chat, "")
	if err != nil {
		t.Fatalf("vacío no debía fallar: %v", err)
	}
	if got != chat {
		t.Fatalf("vacío => chat; got %v want %v", got, chat)
	}

	// Con participant válido => ese JID (caso grupos).
	got, err = resolveReadSender(chat, "5491122334455")
	if err != nil {
		t.Fatalf("participant válido falló: %v", err)
	}
	if got == chat || got.User == "" {
		t.Fatalf("participant debía resolver a un JID propio, got %v", got)
	}

	// Participant inválido => error explícito.
	if _, err = resolveReadSender(chat, "@@no-jid@@"); err == nil {
		t.Fatal("participant inválido debía fallar")
	}
}
