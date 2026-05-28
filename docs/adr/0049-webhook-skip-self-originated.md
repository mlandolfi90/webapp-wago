# 0049 — Webhook: skip de mensajes propios (`IgnoreFromMe`) para romper loops

## Estado
Aceptado.

## Contexto

`whatsmeow` reporta TODOS los mensajes que cruzan la sesión como
`*events.Message`, incluyendo los que el propio bot envía vía
`/send/text` (con `Info.IsFromMe == true`). El handler de eventos del
servicio los procesa como cualquier otro y dispara el webhook (tanto el
legacy `instance.Webhook` como el nuevo multi-webhook de ADR 0045).

Cuando un consumer del webhook (Hermes / orchestrator / cualquier
integración) responde a un mensaje entrante con `/send/text`, el
mensaje saliente vuelve como `*events.Message{IsFromMe:true}` →
dispara webhook → consumer responde a su propio echo → loop infinito
en milisegundos hasta saturar la cola del producer o el rate-limit de
WhatsApp.

El bug se reportó en producción contra el endpoint Hermes y se
reproduce determinísticamente: cualquier `/send/text` con el webhook
configurado dispara el ciclo.

## Decisión

Flag opt-in **`IgnoreFromMe`** simétrico en los dos modelos de webhook,
default `true`:

- `instance_model.Instance.IgnoreFromMe bool` (default `true`) —
  controla el webhook legacy (`instance.Webhook`) Y las colas globales
  (NATS / RabbitMQ / WS) configuradas a nivel servidor.
- `webhook_model.Webhook.IgnoreFromMe bool` (default `true`) — controla
  cada webhook del sistema multi-webhook (ADR 0045+) individualmente.

Default `true` en ambos = comportamiento por defecto protege contra
loops sin requerir acción del usuario. Quien necesite auditar mensajes
salientes lo destilda explícitamente con conocimiento del trade-off.

### Punto único de filtrado: `CallWebhook`

El handler `case *events.Message:` no se toca. `MarkRead`, LID swap,
logging de presencia y demás post-procesamiento siguen normales porque
son comportamientos de la sesión de whatsmeow, no del dispatch. El
filtro vive en `pkg/whatsmeow/service/whatsmeow.go:CallWebhook`, que es
donde converge el dispatch a ambos sistemas:

```go
chatJID, senderJID, isFromMe := w.webhookService.ExtractEventMeta(data)
// Multi-webhook ve siempre el evento; filtra per-webhook adentro.
w.webhookService.Dispatch(instance.Id, eventType, chatJID, senderJID, isFromMe, jsonData)

// Legacy + colas globales: skip si IsFromMe y el flag está activo.
if isFromMe && instance.IgnoreFromMe {
    log("skipping legacy dispatch for self-originated msg ...")
    return
}
// ...resto del dispatch legacy.
```

### Patrón existente reutilizado

Sigue al pie de la letra `IgnoreGroups`/`IgnoreStatus`: mismos 5
puntos del backend (model + AdvancedSettings + repo Select + repo
Updates + handler MCP), mismo patrón de checkbox en `advancedModal.js`.
Cero abstracciones nuevas. Default invertido (`true` vs `false`)
porque el caso típico es romper el loop, no auditarlo.

## Trazabilidad — `WAGO-PATCH(ADR-0049)` markers

Este patch toca código del fork (`pkg/instance`, `pkg/whatsmeow`,
`pkg/webhook`) que comparte historial con Evolution Go upstream. Cada
touchpoint lleva el marker `WAGO-PATCH(ADR-0049)` para identificarlo
al mergear actualizaciones del upstream:

| Archivo | Touchpoints |
|---|---|
| `pkg/instance/model/instance_model.go` | `Instance.IgnoreFromMe` + `AdvancedSettings.IgnoreFromMe` |
| `pkg/instance/repository/instance_repository.go` | `GetAdvancedSettings` Select + map + `UpdateAdvancedSettings` map |
| `pkg/webhook/model/webhook_model.go` | `Webhook.IgnoreFromMe` |
| `pkg/webhook/service/webhook_service.go` | `ExtractEventMeta` (renombre), `MatchesFilter`/`Dispatch` (+isFromMe), `WebhookInput.IgnoreFromMe`, `toModel` |
| `pkg/whatsmeow/service/whatsmeow.go` | `CallWebhook` (~línea 1985, filtro `isFromMe && instance.IgnoreFromMe`) |
| `internal/mcp/tools_instance.go` | `wago_advanced_set` schema + body |
| `internal/mcp/tools_webhooks.go` | `wago_webhook_create`/`update` schema + `buildWebhookBody` |
| `manager/dist/assets/js/features/instances/advancedModal.js` | checkbox legacy |
| `manager/dist/assets/js/features/instances/webhooks/webhookForm.js` | checkbox multi-webhook |
| `manager/dist/assets/js/features/instances/webhooks/webhooksList.js` | chip "incluye propios" |

### Procedimiento al actualizar upstream Evolution Go

1. Hacer el merge / cherry-pick del upstream.
2. Correr:
   ```
   grep -rn "WAGO-PATCH(ADR-0049)" .
   ```
3. La salida debe contener TODOS los archivos de la tabla de arriba.
   Si alguno falta, el merge sobrescribió el patch y hay que
   re-aplicarlo manualmente desde esta ADR (los bloques de código
   están literales abajo).
4. Build + test (`go build ./... && go test ./pkg/... ./internal/...`)
   antes de mergear el branch.

### Bloque de re-aplicación canónico (`CallWebhook`)

```go
// WAGO-PATCH(ADR-0049): skip legacy webhook + colas globales para
// mensajes propios (Info.IsFromMe == true) cuando IgnoreFromMe está
// activo. Rompe loops cuando un consumer del webhook responde a un
// evento vía /send/text. Re-aplicar al mergear upstream Evolution Go.
if isFromMe && instance.IgnoreFromMe {
    w.loggerWrapper.GetLogger(instance.Id).LogInfo(
        "[%s] WAGO-PATCH(ADR-0049): skipping legacy dispatch for self-originated msg eventType=%s chat=%s",
        instance.Id, eventType, chatJID)
    return
}
```

## Consecuencias

**Positivas:**
- Loop reportado cerrado sin requerir migración de consumers.
- El default protege a usuarios que no leen ADRs.
- Multi-webhook conserva granularidad: un webhook puede auditar
  salientes mientras otros del mismo instance los ignoran.
- Cero impacto en `MarkRead`, LID swap, lógica de sesión whatsmeow.

**Negativas:**
- El legacy pierde la capacidad de webhookear mensajes propios cuando
  el flag está activo (default). Quien necesite auditarlos al estilo
  legacy debe destildar el checkbox o migrar al multi-webhook.
- Otro flag más en `AdvancedSettings` — pero el patrón
  `IgnoreGroups`/`IgnoreStatus` ya estaba, así que no introduce
  abstracción nueva.
- Cambio de comportamiento por defecto observable: instalaciones
  pre-existentes verán que ya no llegan webhooks de mensajes propios.
  Mitigado por (a) ser exactamente el bug que la mayoría quería
  arreglar, y (b) flag visible en advancedModal para revertir.

## Alternativas descartadas

- **Filtro en el handler `case *events.Message:` (skip antes de
  `MarkRead`)**: rompe el `MarkRead` automático del bot al enviar
  (comportamiento normal que el usuario quiere preservar).
- **Skip duro sin flag**: descartado por el usuario — quiere opción
  para auditar salientes cuando haga falta.
- **Solo flag en multi-webhook (sin tocar legacy)**: el bug del loop
  afecta al legacy igual; dejarlo sin flag mantiene el bug en
  instalaciones que no migraron a multi-webhook.
- **Flag a nivel servidor (env var)**: pierde granularidad por
  instancia y no es visible desde la UI.
