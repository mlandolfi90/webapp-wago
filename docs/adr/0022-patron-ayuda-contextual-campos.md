# 0022 - Patrón de ayuda contextual en campos de formulario

- Estado: aceptado
- Fecha: 2026-05-16
- Corrida Crisol: webui-fieldhelp-001 (tier completo)

## Contexto y problema

Los formularios del panel `/manager` (login, crear/conectar instancia,
proxy, avanzado, envío) exponen campos cuyo propósito no siempre es obvio
para quien no conoce la API (qué es un token de instancia, qué formato de
número, qué hace cada ajuste avanzado). Se pidió una ayuda contextual al
lado de **cada** campo: qué es, cómo se usa y un ejemplo.

## Decisión

Se establece un **patrón UI único y centralizado** en
`manager/dist/assets/js/ui/form.js`:

- Primitiva `helpHint(text)`: un `<span class="help">` focusable
  (`tabindex=0`, `role="note"`, `aria-label`) con un tooltip hijo
  `.help-pop` mostrado por **CSS puro** en `:hover` y `:focus`/
  `:focus-visible`. Sin listeners JS → sin fugas de eventos ni estado.
- `field(label, control, help?)` y `checkboxRow(text, checked, help?)`
  reciben un parámetro opcional `help`; si está presente, anexan
  `helpHint`. Retrocompatible: sin `help` el render es el de antes.
- Los checkboxes sueltos que antes se construían a mano (createModal
  "Usar proxy", connectModal "Habilitar WebSocket") se refactorizan a
  `checkboxRow()` para que el patrón sea uniforme y se elimine
  duplicación (ADR 0020, código factorizado).
- Estilos en `app.css` (`.help`, `.help-pop`, `.field-label`,
  `.check-row`) coherentes con la identidad Evolution (ADR 0021).

Cobertura: todos los campos de entrada y todos los toggles booleanos.
Los 14 checkboxes de "Eventos a suscribir" comparten **una** ayuda a
nivel del label de grupo (un icono por evento sería ruido visual; la
ayuda explica el conjunto y da el caso típico).

## Alternativas consideradas

- **Tooltip con JS (listeners mouseenter/leave + posicionamiento)**:
  descartado. Más superficie de bug (fugas de listeners, recálculo de
  posición), innecesario para el caso. CSS `:hover/:focus-within` cubre
  ratón y teclado con cero JS.
- **`title=""` nativo del navegador**: descartado. No accesible de forma
  consistente, sin estilo, sin soporte de ejemplo multilínea, aparición
  lenta.
- **Texto de ayuda siempre visible debajo del campo**: descartado.
  Satura formularios ya densos (modales con scroll); la ayuda on-demand
  mantiene la UI limpia.
- **Un icono de ayuda por cada checkbox de evento**: descartado por
  ruido visual; ayuda a nivel de grupo es suficiente.

## Consecuencias

- Positivas: una sola fuente del patrón (cualquier campo nuevo agrega
  ayuda pasando un 3er argumento); accesible (teclado + `aria-label`);
  cero JS de tooltip; sin cambios de contrato/backend; de-duplica dos
  checkboxes hechos a mano.
- Negativas: el texto de ayuda vive en cada call site (no centralizado en
  un diccionario i18n) — aceptable mientras el panel sea monolingüe (ES);
  si se internacionaliza, este texto migra a la capa i18n.
- Neutras: el tooltip se posiciona debajo del icono; en modales con
  `overflow:auto` el cuerpo scrollea para mostrarlo (no se recorta por
  diseño del ancho máximo responsivo).
