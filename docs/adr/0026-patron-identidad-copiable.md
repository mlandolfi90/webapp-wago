# 0026 - Patrón de identidad: nombre humano + id copiable

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: webui-identity-001 (tier completo)

## Contexto y problema

WhatsApp migra a **LID** (`<id>@lid`) para ocultar el número. En la UI,
las entidades (grupos hoy; contactos, newsletters mañana) se mostraban
con el JID/LID como dato visible, pero un humano reconoce **nombres y
números**, no LIDs. El usuario reportó: "veo solo LID, yo conozco los
nombres". Hace falta que lo reconocible sea protagonista, sin perder el
id técnico (que sigue siendo necesario para copiar/depurar).

## Decisión

Se establece un **patrón de identidad reutilizable** en
`manager/dist/assets/js/ui/identity.js`:

- `identityBlock({ name, phone, id, idLabel })`:
  - **Nombre humano destacado** (tipografía display, blanco, peso 700) —
    lo que el usuario reconoce.
  - **Teléfono** en línea legible **si se tiene** (`phone` opcional;
    para grupos no aplica, para contactos sí).
  - **Id técnico (LID/JID) siempre visible** con su label y un
    `copyChip`.
- `copyChip(value)`: botón accesible (`aria-label`, foco) que copia el
  valor en 1 clic y confirma con `toast("Copiado")`. Muestra el valor
  truncado por CSS (tooltip `title` con el valor completo).
- **Clipboard con fallback**: usa `navigator.clipboard` solo en
  `isSecureContext`; si no (el panel suele servirse por **http**),
  cae a `textarea` + `execCommand("copy")`. Nunca rompe; si todo falla,
  avisa "copialo a mano".
- CSS `.identity*` / `.copy-chip` coherente con la identidad Evolution
  (ADR 0021): chip monoespaciado, hover en verde neón.

Aplicado en `groups/groupsModal.js` (tarjetas de la lista) y
`groups/groupActions.js` (header del modal de acciones). Reusable tal
cual para el próximo incremento de Contactos
(`identityBlock({name, phone, id: lid})`).

## Alternativas consideradas

- **Ocultar el LID/JID**: descartado. El usuario pidió explícitamente
  que siga visible y copiable; es necesario para soporte/depuración y
  para pegarlo en otros endpoints.
- **`navigator.clipboard` sin fallback**: descartado. El panel se sirve
  por http en la mayoría de despliegues → `clipboard` no disponible
  fuera de `isSecureContext`; sin fallback el botón sería decorativo.
- **Solo `title`/tooltip nativo para el id**: descartado; no permite
  copiar en 1 clic ni destaca el nombre.
- **Truncar el id en JS**: descartado; el truncado es responsabilidad
  de CSS (`text-overflow`), el valor completo va en `title` y se copia
  entero.

## Consecuencias

- Positivas: el usuario opera reconociendo **nombre** (y teléfono si
  hay); el id técnico queda accesible y copiable sin fricción; patrón
  único reutilizable para todos los dominios de entidades; sin tocar
  backend ni contratos; degrada bien en http.
- Negativas: para grupos no hay teléfono → la línea no se renderiza
  (esperado). El nombre cae a `(sin nombre)` / al JID si la fuente no
  trae nombre (shape proto no garantizado, ya contemplado por
  `groupLabel`).
- Neutras: `ui/identity.js` depende de `feedback.toast` (acoplamiento
  UI↔UI aceptable, ambos en la capa `ui/`).
