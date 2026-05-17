// Package events buffers inbound WhatsApp events (delivered by the
// webapp-wago webhook) so the MCP client can pull them on demand. MCP is
// request/response; WhatsApp is push — this bridges the gap.
package events

import (
	"encoding/json"
	"sync"
	"time"
)

// Event is one buffered webhook delivery.
type Event struct {
	Type string          `json:"type"`
	At   time.Time       `json:"at"`
	Raw  json.RawMessage `json:"raw"`
}

// Buffer is a bounded, thread-safe FIFO of events. When full, the oldest
// event is dropped to make room (newest-wins).
type Buffer struct {
	mu  sync.Mutex
	cap int
	q   []Event
}

// New builds a buffer with the given capacity (min 1).
func New(capacity int) *Buffer {
	if capacity < 1 {
		capacity = 1
	}
	return &Buffer{cap: capacity}
}

func extractType(raw json.RawMessage) string {
	var probe map[string]any
	if json.Unmarshal(raw, &probe) != nil {
		return ""
	}
	for _, k := range []string{"type", "event", "Event", "eventType"} {
		if v, ok := probe[k].(string); ok && v != "" {
			return v
		}
	}
	return ""
}

// Push appends an event, dropping the oldest if at capacity.
func (b *Buffer) Push(raw json.RawMessage) {
	cp := append(json.RawMessage(nil), raw...)
	e := Event{Type: extractType(cp), At: time.Now().UTC(), Raw: cp}
	b.mu.Lock()
	defer b.mu.Unlock()
	if len(b.q) >= b.cap {
		b.q = b.q[len(b.q)-b.cap+1:]
	}
	b.q = append(b.q, e)
}

// Poll removes and returns up to limit events (FIFO). filter != "" keeps
// only events whose Type equals filter. limit <= 0 means all matching.
func (b *Buffer) Poll(filter string, limit int) []Event {
	b.mu.Lock()
	defer b.mu.Unlock()

	out := make([]Event, 0, len(b.q))
	rest := make([]Event, 0, len(b.q))
	for _, e := range b.q {
		take := filter == "" || e.Type == filter
		if take && (limit <= 0 || len(out) < limit) {
			out = append(out, e)
		} else {
			rest = append(rest, e)
		}
	}
	b.q = rest
	return out
}

// Clear drops all buffered events and returns how many were discarded.
func (b *Buffer) Clear() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	n := len(b.q)
	b.q = nil
	return n
}

// Len returns the number of buffered events.
func (b *Buffer) Len() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.q)
}
