# 0045 - Webhooks múltiples por instancia con filtros inline

- Estado: aceptado
- Fecha: 2026-05-27
- Corrida Crisol: multi-webhook-filters-001 (tier completo, 3 carriles
  serializados: backend, webui, mcp-internal)

## Contexto

Hasta ahora cada instancia tenía **un solo webhook** (`Instance.Webhook`
+ `Instance.Events` CSV) y el filtrado era solo por **tipo de evento**,
con un parche heurístico (`@g.us` para grupos) hardcodeado en
`pkg/whatsmeow/service/whatsmeow.go`. Integraciones reales (CRM, soporte,
bots) necesitan rutar eventos a destinos distintos según el chat/grupo
y el sender — hoy es imposible sin un proxy externo.

## Decisión

Tabla nueva `instance_webhooks` con filtro **inline** por fila, y
**dual-dispatch**: el webhook legacy queda intacto y los nuevos disparan
en paralelo. Cero cambio de contrato público de `POST /instance/connect`.

### Modelo

`pkg/webhook/model/webhook_model.go` — struct `Webhook` GORM con
`id` (uuid), `instance_id` (FK + index), `url`, `enabled`, **filtro
inline**: `events []string` (JSON), `chat_type` (`any|group|individual`),
`chat_ids []string` (allowlist), `senders []string` (allowlist).
Cap por instancia: **20** (`MaxWebhooksPerInstance`).

### Filtrado (puro)

`webhook_service.MatchesFilter(w, eventType, chatJID, senderJID) bool`:

- `events` vacío o contiene `ALL` → cualquier eventType pasa; case-insensitive.
- `chatType`: `any` pasa; `group` requiere sufijo `@g.us`; `individual`
  exige no-grupo, no-newsletter, no-broadcast.
- Allowlists (`chatIds`, `senders`): vacía = no filtra; **no vacía +
  dato `""` = rechaza** (semántica explícita: allowlist con dato faltante
  ≠ pasa).

### Dispatch (anti-N+1)

Cada `CallWebhook` en `whatsmeow.go` ahora invoca
`webhookService.Dispatch(instanceID, eventType, chatJID, senderJID,
jsonData)` **antes** de la rama legacy (orthogonal). El service mantiene
**cache in-memory `map[instanceID][]Webhook`** con `sync.RWMutex` —
lazy-load primera vez por instancia, e invalidación (`Reload`) en cada
Create/Update/Delete del handler. Sin cache, cada evento WhatsApp
(cientos/seg en una instancia activa) dispararía un `SELECT`.

### Extracción chat/sender — desviación del Ingeniero

El plan original proponía cambiar la firma de `CallWebhook` agregando
`chatJID, senderJID`. Al implementarlo descubrí que la mayoría de los
7 callers **no tienen `evt.Info` tipado en scope** — construyen
`postMap` desde data ya parseada. Cambiar la firma forzaría pasar `""`
en casi todos sin beneficio. Decisión: extraer **una vez dentro de
CallWebhook** (`webhookService.ExtractChatSender(data)`) cubriendo los
shapes conocidos (Message: `data.Info.Chat/Sender`; Receipt/Presence:
`data.Chat/Sender|RemoteJid|Participant`; postMap legacy: lowercase).
Si la extracción falla → "" → la semántica del allowlist se ocupa.
**Más simple y mismo poder de filtrado.**

### Validaciones (anti-SSRF + integridad)

- URL parsea con `net/url` y exige `http`/`https` con host. Rechaza
  `file://`, `ftp://`, vacíos, malformados.
- `chatType` debe ser uno de los 3 válidos.
- Cada event en `events` debe estar en el catálogo canónico
  (`pkg/internal/event_types`).
- Cap 20/instancia chequeado en `Create`.

### Reuso del producer

`Dispatch` reusa `webhookProducer.Produce(queueName, payload, url,
userID)` — mismas retries (5×30s), mismo logging, mismo header. **No**
llama `sendToQueueOrWebhook` para no duplicar el envío a las colas
globales (RabbitMQ/NATS/WebSocket) que el legacy ya cubre.

### Contrato REST nuevo (instance-scoped, mismo middleware que `/user/*`)

```
GET    /webhook         → 200 { data: [Webhook] }
POST   /webhook         → 201 { data: Webhook }       body: WebhookInput
PUT    /webhook/:id     → 200 { data: Webhook }       body: WebhookInput
DELETE /webhook/:id     → 200 { message: "success" }
```

`WebhookInput = { url, enabled?, events?, chatType?, chatIds?, senders? }`.

### MCP

4 tools nuevas en `internal/mcp/tools_webhooks.go`, scope `wago.Instance`:
`wago_webhooks_list`, `wago_webhook_create`, `wago_webhook_update`,
`wago_webhook_delete`. Test de contrato (`TestWebhookCreateForwardsFilterBody`)
captura el body POST y verifica que las 6 dimensiones se propagan.

### WebUI

Patrón `contactsList.js` (no `tabbedForms.js`): nuevo modal "Webhooks"
en la card de instancia (sección Sesión), con lista de tarjetas
(URL + status + resumen del filtro + editar/borrar) y form expandible
para crear/editar (URL, enabled, checkboxes events, radio chatType,
textareas chatIds/senders). Cada campo lleva `helpHint` (patrón ADR 0022).

## Alternativas consideradas

- **Filtro como entidad reusable** (tabla `filters` separada,
  webhooks referencian por FK): descartado. YAGNI hasta que aparezca
  un caso real de filtros compartidos; por ahora KISS = copia inline.
- **Extender `Instance` con un JSON `[]Webhook`**: descartado.
  Imposibilita índice por `instance_id`, no permite borrar/editar uno
  sin reescribir el blob, y se mezcla con el shape público del Instance.
- **Migrar legacy al nuevo modelo** (clean break): descartado. Rompería
  `POST /instance/connect` y todos los consumidores externos del shape
  `Instance.Webhook`. Costo > beneficio.
- **Cambiar firma de `CallWebhook(+chatJID,+senderJID)`** (plan
  original): descartado al implementar (ver §Extracción).

## Consecuencias

- **Positivas**: rutado granular real (chat/grupo/sender) sin proxy
  externo; el legacy sigue funcionando sin tocar; cap 20 + validación
  URL anti-SSRF + tests de contrato + cache anti-N+1 con `-race`.
- **Negativas**: la tabla nueva implica una migración GORM (idempotente
  vía AutoMigrate); cada instancia ahora hace 2 dispatches potenciales
  por evento (legacy + nuevos) — verificado: no duplica porque van a
  URLs distintas y el legacy no toca el nuevo path.
- **Neutras**: ADR 0027 (Dominio Usuarios/Contactos) no se altera;
  esta feature es ortogonal. Validación del efecto en dispositivo real
  (POST efectivo al receptor con cada filtro) queda como verificación
  externa al sandbox — el contrato y el filtrado están fijados por
  tests estáticos.
