# 0023 - Compositor multi-tipo de envío de mensajes

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: webui-richsend-001 (tier completo)

## Contexto y problema

El panel `/manager` solo permitía enviar **texto** (`/send/text`), pese a
que la API expone además media, link, ubicación, encuesta, contacto y
sticker (MANUAL §7.2). Se necesitaba exponer esos tipos sin convertir el
modal en un monolito con ramas `if (tipo) {...}`.

## Decisión

Se establece un **patrón declarativo de compositor** en
`manager/dist/assets/js/features/instances/send/`:

- `senders.js`: catálogo `SENDERS` — un objeto por tipo con
  `{ id, label, api, build() }`. `build()` devuelve
  `{ fields, validate, body }`: los controles ya con ayuda contextual
  (`field`/`helpHint`, ADR 0022), su validación y el armado del body
  exacto según el contrato del endpoint.
- `sendModal.js`: orquestador agnóstico al tipo. Renderiza el campo
  común `number`, un **segmented control** (`.seg`) para elegir tipo, y
  delega el resto en el sender activo. El submit es genérico:
  `{ number, ...sender.body() }` → `sender.api(token, body)`.
- `core/api.js`: una función fina por endpoint (`sendLink`, `sendMedia`,
  `sendLocation`, `sendPoll`, `sendContact`, `sendSticker`), mismo patrón
  que `sendText`.
- CSS `.seg` en `app.css`, coherente con la identidad Evolution
  (ADR 0021).

Agregar un tipo nuevo = agregar una entrada a `SENDERS` (cero cambios en
el orquestador). El antiguo `features/instances/sendModal.js` se elimina
(reemplazado, sin shim de compatibilidad).

## Alternativas consideradas

- **Un modal con `switch(tipo)` y todos los campos inline**: descartado.
  Monolito con responsabilidad difusa (ADR 0020); agregar un tipo obliga
  a tocar la lógica común.
- **Un modal distinto por tipo (7 archivos `openXModal`)**: descartado.
  Duplica el armazón (number + validación + submit + busy) siete veces.
- **Mantener solo texto y documentar el resto en el manual**: descartado;
  el objetivo explícito es exponer la utilidad en la UI.

## Consecuencias

- Positivas: cobertura de 7 tipos de envío con un orquestador único;
  extensible por datos (no por código); reusa modal/field/helpHint/tema;
  sin cambios de contrato backend; cada tipo arma el body según el
  contrato real (swagger) con validación previa.
- Negativas: `senders.js` concentra el copy de ayuda de los 7 tipos
  (igual que ADR 0022, aceptable mientras el panel sea monolingüe ES).
- Neutras: el botón de la tarjeta pasa de "Probar envío" a "Enviar"
  (ya no es solo una prueba de texto). Endpoints `/send/button|list|
  carousel|status/*` quedan fuera de este incremento (UI compleja;
  corrida futura).
