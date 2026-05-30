# 0037 - Fix: read receipts (checks azules) en grupos

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: fix-markread-group (tier completo)

## Contexto y problema

Bug real confirmado de forma independiente (no por reporte de terceros):
`pkg/message/service/message_service.go` llamaba
`client.MarkRead(ctx, ids, time.Now(), jid, jid)` pasando el **mismo
jid** (parseado de `data.Number`) como `chat` **y** como `sender`.

La doc de `whatsmeow.MarkRead` (whatsmeow-lib/receipt.go) es explícita:
el 2º parámetro (`sender`) **debe** ser, en grupos, el user ID que
envió el mensaje — no el JID del grupo. Consecuencia: en grupos el
recibo de lectura no se emitía correctamente → el otro no ve el check
azul aunque se haya leído. Riesgo real: patrón no-humano ⇒ baneo.
`MarkReadStruct` no tenía forma de indicar el participante. Bug extra:
`ts` se declaraba, nunca se seteaba, y se devolvía `ts.String()` (cero).

## Decisión

Fix **aditivo y retrocompatible**, contrato extendido:

- `MarkReadStruct` suma `Participant string json:"participant,omitempty"`.
- Helper **puro y testeable** `resolveReadSender(chat, participant)`:
  vacío ⇒ `sender = chat` (comportamiento histórico, DMs intactos);
  con participant ⇒ ese JID (correcto en grupos). Inválido ⇒ error.
- `MarkRead` usa el helper y setea `ts := time.Now()` (corrige el
  retorno en cero).
- **Propagación del mismo contrato** en la misma corrida para evitar
  divergencia: tool MCP `wago_mark_read` (arg opcional `participant`) y
  form webui "Marcar leído" (campo "Participante (grupos)").

Ubicación del fix: **webapp-wago (el caller)**. whatsmeow está bien;
patchearlo allí sería el lugar equivocado y causaría divergencia.

## Alternativas consideradas

- **Inferir el participante desde el ID del mensaje**: descartado; el
  caller es quien conoce el autor (viene del evento entrante). Inferir
  requeriría lookup/estado que el endpoint no tiene.
- **Hacer `participant` obligatorio**: descartado; rompería a todos los
  clientes 1-a-1 actuales. Opcional con fallback = cero regresión.
- **Solo backend (no tocar MCP/webui)**: descartado; dejaría esos dos
  sin poder fijar checks azules en grupos y divergiría el contrato.

## Verificación (honesta)

- `go build ./... && go vet ./... && go test ./...` verdes; el helper
  `resolveReadSender` queda cubierto por test unitario; `node --check`
  de los módulos JS OK; call-site revisado.
- **Validación real — PROVISORIA, no cerrada**: no hay dispositivo en
  el sandbox. El humano reportó verbalmente "eso funciona" (2026-05-17),
  pero por decisión explícita suya queda como **observación provisoria**,
  NO como validación formal: falta una prueba **reproducible y con
  evidencia** (grupo de 2, registro del doble check azul) antes de darla
  por cerrada. Hasta entonces: no asumir validado end-to-end.

## Consecuencias

- Positivas: read receipts correctos en grupos al pasar `participant`;
  DMs sin cambios; contrato consistente backend+MCP+webui; helper
  testeable; corrige además el `ts` en cero.
- Negativas: el cliente debe **saber y enviar** el participante en
  grupos (es intrínseco al protocolo de WhatsApp; documentado en los 3
  lados).
- Abierto: el humano dijo "eso funciona" (provisorio); falta prueba
  reproducible con evidencia para cerrar la validación end-to-end.
