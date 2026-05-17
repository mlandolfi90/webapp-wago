# 0030 - tabbedForms con tabs custom; deuda de duplicación saldada

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: webui-debt-001 (tier completo)

## Contexto y problema

ADR 0028 registró deuda explícita: `groupsModal.js` y `usersModal.js`
mantenían su propia orquestación `seg + modal + select` (y `usersModal`
además una copia **exacta** de `renderForm` de
`_shared/tabbedForms.js`). Triple implementación del mismo andamiaje →
viola ADR 0020 (código factorizado). Restricción dura: **no-regresión**
(esos modales funcionan y están en uso).

## Decisión

1. **Generalizar `_shared/tabbedForms.js`** (retrocompatible): un tab
   ahora puede ser *form-tab* (igual que antes:
   `build/api/result?/load?`) **o** *custom-tab*
   `{ id, label, render(area, inst, ctx) }`. `ctx = { go(tabId),
   refresh() }` permite navegar/recargar pestañas. `select()` decide por
   `typeof tab.render === "function"`. Los catálogos existentes
   (messages, community, labels, newsletters, utils) **no cambian**.
2. **`usersModal.js` → fino**: delega en `openTabbedForms` con
   *Contactos*/*Bloqueados* como custom-tabs (delegan a
   `contactsList.renderContacts/renderBlocklist`) y `...USER_FORMS` como
   form-tabs. Se elimina la copia de `renderForm` y el andamiaje.
3. **`groupsModal.js` → fino**: *Mis grupos/Crear/Unirme* como
   custom-tabs (las funciones de render se conservan **idénticas** en
   comportamiento; `select(TABS[0])` → `ctx.go("list")`; el callback de
   "Gestionar" → `ctx.refresh`).
4. **`groupActions.js` NO se toca.** Es un orquestador **por-entidad**
   distinto: inyecta `groupJid`, renderiza header `identityBlock`, y
   soporta `confirm?`/`reload?`. No es el mismo patrón que el de
   pestañas-formulario; forzarlo a `tabbedForms` sería sobre-ingeniería
   y ampliaría el blast radius. Queda como patrón hermano documentado.

## Alternativas consideradas

- **Migrar también `groupActions` a `tabbedForms`**: descartado.
  Responsabilidad distinta (acciones sobre una entidad seleccionada con
  header/confirm/reload); meterlo forzaría flags ajenos al helper.
- **Dejar la deuda**: descartado; estaba explícitamente registrada para
  saldarse y es duplicación real (ADR 0020).
- **Helper de listas separado**: innecesario; el custom-tab
  `render(area, inst, ctx)` cubre listas y formularios bespoke sin un
  segundo helper.

## Consecuencias

- Positivas: **una sola** orquestación de pestañas en todo el panel;
  `usersModal`/`groupsModal` pasan a ~15 líneas; comportamiento idéntico
  (no-regresión verificada por render real); helper más capaz
  (custom-tabs) y retrocompatible con los 5 dominios ya migrados.
- Negativas: el helper crece levemente en superficie (ramा custom);
  aceptable frente a eliminar la triplicación.
- Neutras: `groupActions.js` permanece como segundo patrón
  (por-entidad), ahora **documentado** como decisión, no como deuda.
