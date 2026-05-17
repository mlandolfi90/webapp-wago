package events

import (
	"encoding/json"
	"testing"
)

func push(b *Buffer, s string) { b.Push(json.RawMessage(s)) }

func TestPushCapDropsOldest(t *testing.T) {
	b := New(2)
	push(b, `{"type":"A","n":1}`)
	push(b, `{"type":"B","n":2}`)
	push(b, `{"type":"C","n":3}`)
	if b.Len() != 2 {
		t.Fatalf("len = %d, want 2", b.Len())
	}
	ev := b.Poll("", 0)
	if len(ev) != 2 || ev[0].Type != "B" || ev[1].Type != "C" {
		t.Fatalf("se esperaba [B,C], got %+v", ev)
	}
}

func TestPollConsumes(t *testing.T) {
	b := New(10)
	push(b, `{"type":"X"}`)
	if got := b.Poll("", 0); len(got) != 1 {
		t.Fatalf("poll = %d", len(got))
	}
	if b.Len() != 0 {
		t.Fatal("poll debía consumir")
	}
}

func TestPollFilterAndLimit(t *testing.T) {
	b := New(10)
	push(b, `{"type":"MESSAGE","n":1}`)
	push(b, `{"type":"CONNECTION"}`)
	push(b, `{"type":"MESSAGE","n":2}`)

	got := b.Poll("MESSAGE", 1)
	if len(got) != 1 || got[0].Type != "MESSAGE" {
		t.Fatalf("filtro+limit falló: %+v", got)
	}
	// El no-coincidente y el MESSAGE no tomado siguen en buffer.
	if b.Len() != 2 {
		t.Fatalf("remaining = %d, want 2", b.Len())
	}
	rest := b.Poll("", 0)
	if len(rest) != 2 {
		t.Fatalf("rest = %+v", rest)
	}
}

func TestClear(t *testing.T) {
	b := New(5)
	push(b, `{"type":"A"}`)
	push(b, `{"type":"B"}`)
	if n := b.Clear(); n != 2 {
		t.Fatalf("clear = %d, want 2", n)
	}
	if b.Len() != 0 {
		t.Fatal("clear debía vaciar")
	}
}

func TestTypeExtractionFallback(t *testing.T) {
	b := New(5)
	push(b, `{"event":"QRCODE"}`)
	push(b, `{"nope":1}`)
	ev := b.Poll("", 0)
	if ev[0].Type != "QRCODE" || ev[1].Type != "" {
		t.Fatalf("type extraction: %+v", ev)
	}
}
