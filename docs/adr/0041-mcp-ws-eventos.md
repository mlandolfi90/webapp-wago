# 0041 - Recepción de eventos por WebSocket en el MCP

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: mcp-ws-events-001 (tier completo)

## Contexto y problema

ADR 0034 dio recepción de eventos por **webhook** (pull vía
`wago_events_poll`). Algunos despliegues prefieren/necesitan
**WebSocket** (el backend expone `/ws`), p.ej. cuando no hay URL pública
para webhook. Faltaba esa vía de ingreso, sin romper el webhook.

## Decisión

Cliente WS **aditivo y opcional** que reusa el `events.Buffer` existente
(lo consume `wago_events_poll`):

- `internal/events/wsclient.go`: `RunWS(ctx, WSConfig, *Buffer)` —
  conecta con `gorilla/websocket` (**ya en go.mod v1.5.3**, sin
  dependencia nueva), lee mensajes y hace `buf.Push`. Reconexión con
  **backoff exponencial** (reset al conectar sano), corte por `ctx`.
  `WSConfig` con `Min/MaxBackoff` **inyectables** → tests rápidos.
- `cmd/mcp/main.go`: si `MCP_WS_URL` está seteado, `go events.RunWS(...)`
  **bajo cualquier transporte** (stdio o http). Independiente del
  webhook: ambos empujan al mismo buffer.

## Alternativas consideradas

- **Reemplazar el webhook por WS**: descartado; webhook ya funciona y
  hay despliegues que lo usan. WS es alternativa, no reemplazo.
- **Nueva dependencia WS**: innecesaria; `gorilla/websocket` ya está en
  el módulo (lo usa el backend).
- **Backoff fijo**: descartado; exponencial con tope evita martillar el
  backend en caídas; parametrizable para test.
- **Multiplexar a notificaciones MCP server→client**: fuera de alcance
  (ADR 0034 ya decidió pull explícito; se mantiene coherencia).

## Verificación (honesta)

- `go build/vet/test` verdes. Tests con servidor WS mock
  (`gorilla` upgrader + `httptest`): (1) un mensaje enviado llega al
  buffer; (2) reconexión — el server corta y el cliente reintenta con
  backoff chico y termina recibiendo. Bounded por `context` timeout.
- No requiere dispositivo ni backend real (mock). 100% verificable acá.

## Consecuencias

- Positivas: segunda vía de eventos entrantes; reusa buffer y
  `wago_events_poll`; cero deps nuevas; no toca el webhook ni el
  contrato; resiliente (reconnect/backoff).
- Negativas: si `MCP_WS_URL` apunta mal, el cliente reintenta en loop
  (con backoff) y loguea — comportamiento esperado, no fatal.
- Neutras: el formato exacto del frame del `/ws` del backend se asume
  JSON crudo (igual que el webhook); si difiere, se ajusta el push en
  una corrida futura (no observable sin backend real).
