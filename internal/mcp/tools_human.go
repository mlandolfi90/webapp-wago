package mcp

import (
	"context"
	"errors"
	"math/rand"
	"sync"
	"time"

	"github.com/webapp-wago/webapp-wago/internal/wago"
)

// Random seed local con mutex (Go 1.20+ tiene global pero queremos
// jitter independiente por handler — algunos LLMs disparan en
// paralelo para distintos chats).
var (
	humanRand   = rand.New(rand.NewSource(time.Now().UnixNano()))
	humanRandMu sync.Mutex
)

// sleepHuman duerme entre min y max (inclusive) o retorna si ctx cancela.
func sleepHuman(ctx context.Context, min, max time.Duration) error {
	humanRandMu.Lock()
	jitter := min + time.Duration(humanRand.Int63n(int64(max-min)+1))
	humanRandMu.Unlock()
	select {
	case <-time.After(jitter):
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// writingDuration aproxima el tiempo que tarda un humano escribiendo
// `text`. Base 2s + 1s cada 30 chars, cap 12s. Más jitter ±20%.
func writingDuration(text string) time.Duration {
	base := time.Duration(2+len(text)/30) * time.Second
	if base > 12*time.Second {
		base = 12 * time.Second
	}
	humanRandMu.Lock()
	jitter := time.Duration(float64(base) * (0.8 + 0.4*humanRand.Float64()))
	humanRandMu.Unlock()
	return jitter
}

func humanTools(c *wago.Client) []Tool {
	return []Tool{
		{
			Name: "wago_human_reply",
			Description: "RESPONDE con timing humano simulado — DEFAULT para responder mensajes conversacionales " +
				"de WhatsApp. Ejecuta server-side, en este orden:\n" +
				"  (1) sleep 2-5s aleatorio (simula 'abrir el chat')\n" +
				"  (2) /message/markread → ✓✓ azul en el msg recibido\n" +
				"  (3) /message/presence composing → 'está escribiendo…'\n" +
				"  (4) sleep ~max(2, len(text)/30)s con jitter ±20%, cap 12s\n" +
				"  (5) /send/text → envía la respuesta\n" +
				"Total: 5-17s típico. Bloquea el response al LLM hasta completar — eso es intencional, " +
				"el LLM no debería esperar paralelo. POR QUÉ usar esto y no las tools granulares: " +
				"WhatsApp DETECTA patrones temporales (response time consistente <1s = bot). Esta tool " +
				"emula el timing natural de un humano con jitter aleatorio. Mitiga riesgo de ban.\n" +
				"Args: number (JID del chat — ej. 5491100000000@s.whatsapp.net o 1234@g.us), " +
				"message_id (ID del mensaje a marcar leído; del wago_events_poll), " +
				"text (respuesta), " +
				"participant (opcional; en GRUPOS = JID del autor del msg).",
			InputSchema: schema(`{"type":"object","properties":{"number":{"type":"string"},"message_id":{"type":"string"},"text":{"type":"string"},"participant":{"type":"string"}},"required":["number","message_id","text"]}`),
			Handler: func(ctx context.Context, a map[string]any) (string, error) {
				number, err := reqStr(a, "number")
				if err != nil {
					return "", err
				}
				messageID, err := reqStr(a, "message_id")
				if err != nil {
					return "", err
				}
				text, err := reqStr(a, "text")
				if err != nil {
					return "", err
				}
				if text == "" {
					return "", errors.New("text vacío")
				}
				participant := str(a, "participant")

				// (1) delay aleatorio simulando "abrir el chat"
				if err := sleepHuman(ctx, 2*time.Second, 5*time.Second); err != nil {
					return "", err
				}

				// (2) mark_read
				readBody := map[string]any{
					"number": number,
					"id":     []string{messageID},
				}
				if participant != "" {
					readBody["participant"] = participant
				}
				if _, err := c.Do(ctx, wago.Instance, "POST", "/message/markread", readBody); err != nil {
					return "", err
				}

				// (3) composing
				if _, err := c.Do(ctx, wago.Instance, "POST", "/message/presence", map[string]any{
					"number": number,
					"state":  "composing",
				}); err != nil {
					// si presence falla, no abortamos — el send sigue. Logueamos pasando.
				}

				// (4) sleep proporcional al largo + jitter
				wd := writingDuration(text)
				select {
				case <-time.After(wd):
				case <-ctx.Done():
					return "", ctx.Err()
				}

				// (5) send_text — WhatsApp limpia el composing automático al recibirlo
				return okJSON(c.Do(ctx, wago.Instance, "POST", "/send/text", map[string]any{
					"number": number,
					"text":   text,
				}))
			},
		},
	}
}
