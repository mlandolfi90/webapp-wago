# 0016 — MCP `wago_human_reply`: anti-ban via timing humano

Nota técnica del tool wrapper `wago_human_reply` que orquesta
mark_read + composing + sleep + send con timing humano forzado
server-side, para mitigar el riesgo de ban de WhatsApp por
patrones temporales no-humanos.

## Contexto

La nota `0015` documentó el patrón humano de respuesta como guía en
la descripción de `wago_chat_presence`. Sin embargo, depende de
que el LLM la lea y la respete — la mayoría de los LLMs SÍ lo
hacen, pero el patrón puede ejecutarse en milisegundos:

```
T=0ms     wago_mark_read       → ✓✓ azul casi instantáneo
T=10ms    wago_chat_presence composing
T=300ms   wago_send_text       → mensaje completo
```

Eso es **indetectablemente NO humano**. WhatsApp banea por (entre
otras cosas) patrones temporales sospechosos: response time
consistente <1s, composing que dura 50ms, volumen alto con timing
perfecto.

## Decisión

Crear una tool wrapper `wago_human_reply` que **orquesta la
secuencia server-side** con timing humano forzado e jitter
aleatorio. El LLM la llama una sola vez y el handler bloquea hasta
completar la secuencia entera.

### Secuencia server-side

```
1. sleep(2-5s aleatorio)           ← "abrir el chat"
2. POST /message/markread          → ✓✓ azul
3. POST /message/presence composing → "está escribiendo…"
4. sleep(max(2, len(text)/30) ±20%, cap 12s)  ← tiempo de escritura
5. POST /send/text                  → mensaje (limpia composing auto)
```

Total típico: 5-17 segundos. El LLM bloquea durante todo eso —
intencional: si la response es no-bloqueante, el LLM podría
intentar llamadas en paralelo que rompen el patrón humano.

### Tools combinadas (decisión: opción C del análisis)

Coexisten en el MCP:
- `wago_human_reply` — DEFAULT recomendado, orquesta con timing.
- `wago_mark_read`, `wago_chat_presence`, `wago_send_text` —
  granulares, para casos avanzados que requieren control fino
  (e.g. respuesta multi-parte, audio, etc.).

## Implementación

Archivo nuevo: `internal/mcp/tools_human.go` (~110 LOC).

```go
func humanTools(c *wago.Client) []Tool { ... }

// Helpers:
func sleepHuman(ctx, min, max time.Duration) error  // jitter aleatorio
func writingDuration(text string) time.Duration     // 2s + len/30, cap 12, ±20% jitter
```

Helpers comparten un `rand.Rand` con mutex para evitar contention
si el LLM dispara handlers paralelos para distintos chats.

Registrado en `internal/mcp/tools.go::BuildTools`:

```go
all = append(all, humanTools(c)...)
```

### Args del tool

| Arg | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `number` | string | sí | JID del chat (`549...@s.whatsapp.net` o `123@g.us`) |
| `message_id` | string | sí | ID del mensaje a marcar leído (del `wago_events_poll`) |
| `text` | string | sí | Respuesta a enviar |
| `participant` | string | no | JID del autor (solo grupos — sin él, el read receipt no registra) |

### Comportamiento con errores

- `mark_read` falla → aborta toda la secuencia con error (el LLM debe reintentar).
- `presence composing` falla → continúa al `send` (presence no es crítica para el envío).
- `send_text` falla → propaga el error al LLM (sin compensación; el "leído" ya quedó marcado).

### Comportamiento con ctx.Done()

Si el cliente MCP cancela durante uno de los `sleep`, el handler
retorna `ctx.Err()` inmediato (no espera el resto del sleep). Los
calls HTTP ya emitidos NO se revierten — el `mark_read` queda
marcado en WhatsApp incluso si la secuencia aborta.

## Validación

- `go build ./...` PASS.
- `go test ./internal/mcp/... -count=1` PASS, incluye:
  - `TestHumanReplyToolPresent`: tool registrada en el catálogo.
  - `TestHumanReplyOrchestratesThreeCalls`: handler ejecuta las 3
    llamadas HTTP en orden esperado (`POST /message/markread` →
    `POST /message/presence` → `POST /send/text`). El test
    completa en ~4s (texto cortísimo "ok", base = 2+0 = 2s + jitter).
- `TestBuildToolsCatalog` sigue PASS con **74 tools** (era 73 tras
  la corrida anterior — sumamos 1 más).

## Para qué usarlo

- Bot conversacional 1-a-1 o en grupos que responde mensajes.
- Cualquier flow donde el LLM responde con texto y querés
  comportamiento indistinguible de un humano.

## Cuándo NO usarlo

- Broadcast: este tool es para 1 destinatario. Para multi-cast no
  hay protección anti-ban: bulk a contactos nuevos te banea
  independientemente del timing.
- Mensajes proactivos (no responden a un mensaje recibido): no
  tenés `message_id` para marcar leído. Usar `wago_send_text`
  directamente.
- Respuesta multimedia (audio, imagen, álbum): este tool solo manda
  texto. Para esos casos, usar tools granulares con manual
  composing (`isAudio: true` para audio).

## Limitaciones conocidas

- El sleep bloquea la goroutine del handler. Múltiples
  conversaciones en paralelo OK (cada una su goroutine), pero el
  total de calls en vuelo simultáneos al MCP no debería superar
  ~50 (límite operacional del Go runtime + límite de conexiones
  del backend wago).
- Si reiniciás el MCP a mitad de un sleep, esa respuesta se
  pierde. El LLM debería detectar la falla y reintentar.
- Random jitter usa `math/rand` (no crypto/rand). Suficiente para
  mitigar detección estadística — no es criptografía.
