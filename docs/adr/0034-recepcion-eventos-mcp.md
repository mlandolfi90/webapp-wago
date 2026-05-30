# 0034 - Recepción de eventos entrantes en el servidor MCP

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: mcp-events-001 (tier completo)

## Contexto y problema

MCP es *pull* (el modelo invoca tools); WhatsApp es *push* (webhook /
WebSocket). El servidor MCP (ADR 0032/0033) no podía recibir mensajes
entrantes. Hacía falta un puente sin acoplar el ciclo request/response
de MCP a un stream.

## Decisión

Nuevo paquete `internal/events` + integración:

- `events.Buffer`: cola FIFO **acotada y thread-safe** (newest-wins:
  al llenarse descarta el más viejo). `Push(raw)` extrae best-effort el
  `type`/`event`; `Poll(filter, limit)` devuelve **y consume** (FIFO,
  filtro por tipo, límite); `Clear()`, `Len()`.
- `events.Handler(buf)`: receptor HTTP `POST` (body JSON, límite 8 MiB)
  que empuja al buffer. Se monta en `/webhook`.
- `internal/mcp/http.go`: refactor retrocompatible — `Serve` delega en
  `ServeWith(ctx, addr, extra)` que monta rutas extra en el **mismo
  listener**. `HTTPHandler()` intacto (tests).
- `internal/mcp/tools_events.go`: `EventTools(buf)` → `wago_events_poll`
  (args `type?`, `limit?`) y `wago_events_clear`. `main` hace
  `append(BuildTools(client), EventTools(buf)...)`.
- `cmd/mcp/main.go`: bajo **http** el webhook comparte `MCP_HTTP_ADDR`
  (`/webhook`); bajo **stdio**, si `MCP_WEBHOOK_ADDR` está seteado,
  corre un server de webhook aparte. `MCP_EVENTS_MAX` (def 500).

Uso: registrar `https://<host>/webhook` vía el arg `webhookUrl` de
`wago_connect`; el modelo drena con `wago_events_poll`.

## Alternativas consideradas

- **Conexión WebSocket al backend (`/ws`)**: descartado en esta corrida;
  el webhook es más simple, sin reconexión ni manejo de stream, y cubre
  el caso. WS queda como posible extensión.
- **Buffer ilimitado**: descartado (riesgo de OOM con tráfico alto);
  cola acotada con descarte del más viejo es seguro y predecible.
- **Entregar eventos como notificaciones MCP (server→client)**:
  descartado; requeriría sesión SSE fiable y manejo de backpressure.
  Pull explícito (`wago_events_poll`) es robusto y testeable.
- **Tocar el Dockerfile para exponer el puerto webhook**: descartado
  (CLAUDE.md); follow-up junto al de ADR 0032.

## Consecuencias

- Positivas: el MCP ya recibe mensajes entrantes; cero deps nuevas;
  `Serve` retrocompatible; buffer acotado seguro; testeable sin cliente
  MCP real.
- Negativas: los eventos se pierden si nadie hace `poll` antes de
  superar la capacidad (es el trade-off explícito newest-wins); sin
  persistencia (in-memory por proceso).
- Neutras: un solo buffer global por proceso (un MCP server ≈ una
  sesión lógica); multi-instancia fan-out queda fuera de alcance.
