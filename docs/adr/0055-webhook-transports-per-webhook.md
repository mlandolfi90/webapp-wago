# 0055 - Webhook transports per-webhook (RabbitMQ / WebSocket / NATS)

- Estado: aceptado
- Fecha: 2026-05-29
- Corrida Crisol: webui-transports-settings-connect-01 (tier completo, Carril A)
- Depende de: ADR 0045 (multi-webhook), 0049 (IgnoreFromMe)
- Marker en código: `WAGO-PATCH(ADR-0055)`

## Contexto

Hasta hoy el modelo `Webhook` (multi-webhook, ADR 0045+) solo soportaba
un único transport por entry: HTTP POST a `URL`. Los transports
adicionales que el backend Evolution Go expone (RabbitMQ, WebSocket
broadcaster, NATS) eran globales por instancia (`Instance.RabbitmqEnable`,
`Instance.WebSocketEnable`, `Instance.NatsEnable` — strings con nombre
de queue), independientes del filtro inline del multi-webhook.

Eso obliga a una de dos malas opciones cuando el usuario quiere "que
los eventos filtrados de este webhook también vayan a NATS":

1. Activar el transport global a nivel Instance → todos los eventos
   (sin filtro) salen además por NATS. Ruidoso.
2. Conformarse con HTTP. Pierde la integración nativa con RabbitMQ/NATS.

El user pidió explícitamente al diseñar el "nuevo modelo de N webhooks":
**cada webhook con URL + Eventos + Tipo chat + Allowlist + RabbitMQ +
WebSocket + NATS embebidos**. Esta ADR cierra esa pieza.

## Decisión

Extender `pkg/webhook/model/webhook_model.go::Webhook` con 3 campos
booleanos per-webhook:

```go
RabbitmqEnable  bool `json:"rabbitmqEnable"  gorm:"default:false"`
WebsocketEnable bool `json:"websocketEnable" gorm:"default:false"`
NatsEnable      bool `json:"natsEnable"      gorm:"default:false"`
```

Decisión deliberada: **bool** (no string como en `Instance`). El campo
controla un toggle simple "habilitar este transport para los eventos
que matcheen el filtro de este webhook". El backend usa **las colas
globales** (`AMQP_GLOBAL_ENABLED`, NATS subject configurado en env,
etc.) ya configuradas para la instancia; no soporta queue/subject
custom per-webhook. Esto evita explotar la superficie de configuración
y mantiene el principio "el filtro vive en el modelo Webhook, el
transport vive en la config global".

### Cambios en `pkg/webhook/service/webhook_service.go`

1. **`WebhookInput`** suma 3 `*bool` opcionales para que `Update`
   distinga ausente (no toca) de explícito false/true.
2. **`toModel`** copia los 3 con default `false`.
3. **`webhookService` struct** suma 3 referencias opcionales a
   `producer_interfaces.Producer` (rabbitmq, ws, nats). Cualquiera
   puede ser nil si la config global de ese transport no levantó.
4. **`SetTransports(rabbitmq, websocket, nats)`** — método nuevo en el
   interface, se llama desde `main.go` tras `NewWebhookService` para
   inyectar los producers globales. Setter (no constructor extendido)
   para no romper callers existentes ni el orden de inicialización
   actual.
5. **`Dispatch`** — después del `MatchesFilter` OK y el HTTP POST a
   `URL` (transport base, siempre activo), publica condicionalmente
   a cada transport adicional si **ambos** se cumplen: el flag del
   webhook en `true` Y el producer correspondiente no es `nil`. Cada
   producer es fire-and-forget igual que el HTTP (errores ignorados).

### Cableado en `cmd/webapp-wago/main.go`

```go
webhookService := webhook_service.NewWebhookService(...)
webhookService.SetTransports(rabbitmqProducer, websocketProducer, natsProducer)
```

## Alternativas consideradas

- **`string` per-webhook con queue/subject custom**: descartada. Explota
  la configuración para un caso de uso muy minoritario. Si surge la
  necesidad, una ADR futura puede sumar `RabbitmqQueue string` opcional
  que override la global.
- **Activar todos los transports globales y filtrar en el consumer**:
  descartada. Mueve el filtro a múltiples consumers (acoplamiento
  cruzado), pierde la semántica "webhook = unidad de policy".
- **Extender el constructor `NewWebhookService` con 3 args nuevos**:
  descartada. Rompe upstream merges (Evolution Go) y los tests
  existentes que construyen el service directo con `&webhookService{}`.
  El setter es minimamente invasivo.
- **Migrar las flags a otro modelo separado (Many-to-Many)**: descartada
  por innecesario. Los flags son booleanos pequeños, no justifican una
  tabla nueva.

## Consecuencias

### Positivas
- El user puede crear N webhooks con políticas distintas: `wh1` solo
  HTTP a integration1, `wh2` HTTP + NATS para audit pipeline, `wh3`
  WS para dashboard real-time. Todos respetan el mismo filtro inline.
- Cero impacto en webhooks existentes: defaults `false` → HTTP-only
  como antes. AutoMigrate de GORM agrega las columnas al boot sin
  intervención manual.
- Reutiliza los 3 producers ya wired en `main.go` — sin nuevos
  servicios ni nuevas conexiones.
- Marker `WAGO-PATCH(ADR-0055)` permite re-aplicar el cambio al
  mergear upstream Evolution Go.

### Negativas
- Sumar 3 columnas al schema requiere AutoMigrate al boot (ya lo hace
  GORM). Sin migración manual.
- El user puede activar un flag y no ver dispatch si la config global
  del transport no levantó. El UI muestra un hint pero no bloquea.

### Neutras
- Los tests del dispatch suben de N a N+4 (HTTPOnlyByDefault,
  AllTransports, SelectiveTransports, NilSafe). Cubre los 4 cuadrantes
  relevantes (default, todos on, mixto, producers nil).

## Validación

- `go build ./cmd/webapp-wago` PASS.
- `go test ./pkg/webhook/... -count=1` PASS con los 4 tests nuevos +
  todos los anteriores en verde.
- Verificación E2E (Playwright contra Wago + Postgres reales) cubre:
  crear webhook con `natsEnable=true` desde el form UI, GET /webhook
  devuelve el campo en el response, el toggle se preserva al editar.
  Ver entrada `webui-transports-settings-connect-01` en
  `docs/adr/RUN-LEDGER.md`.
