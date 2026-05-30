package events

import (
	"encoding/json"
	"fmt"
	"sync"
	"testing"
)

// Se corre con -race: detecta data races en Push/Poll/Len/Clear.
func TestBufferConcurrentPushPoll(t *testing.T) {
	const cap = 50
	b := New(cap)

	var wg sync.WaitGroup
	// Productores.
	for p := 0; p < 8; p++ {
		wg.Add(1)
		go func(p int) {
			defer wg.Done()
			for i := 0; i < 200; i++ {
				b.Push(json.RawMessage(fmt.Sprintf(`{"type":"E%d","i":%d}`, p, i)))
			}
		}(p)
	}
	// Consumidores concurrentes.
	for c := 0; c < 4; c++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 300; i++ {
				_ = b.Poll("", 7)
				_ = b.Len()
			}
		}()
	}
	wg.Wait()

	// Invariante: nunca excede la capacidad.
	if n := b.Len(); n > cap {
		t.Fatalf("Len=%d excede cap=%d", n, cap)
	}
	if n := b.Clear(); n < 0 {
		t.Fatalf("Clear negativo: %d", n)
	}
	if b.Len() != 0 {
		t.Fatal("Clear no vació")
	}
}
