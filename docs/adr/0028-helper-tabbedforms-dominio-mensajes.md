# 0028 - Helper compartido tabbedForms + dominio Mensajes

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: webui-messages-001 (tier completo)

## Contexto y problema

Tras Grupos (ADR 0025) y Usuarios (ADR 0027), la orquestación de
"pestañas-formulario" (un `seg` de formularios declarativos con
build/validate/body, `result?` y `load?`) estaba **implementada inline
dentro de `usersModal.js`**. El dominio Mensajes es 100% formularios:
copiar esa orquestación una 3ª vez sería duplicación (viola ADR 0020,
código factorizado).

## Decisión

1. **Extraer el patrón** a un helper compartido
   `features/instances/_shared/tabbedForms.js`:
   `openTabbedForms({ title, inst, forms })`. Encapsula modal + `seg` +
   ciclo build→submit→(result|toast) + `load` de prefill. Es la
   consolidación canónica del patrón que ADR 0025/0027 describieron.
2. **Dominio Mensajes** en `features/instances/messages/`:
   - `messageForms.js` — catálogo `MESSAGE_FORMS` (react, markread,
     delete, edit, status→result, downloadmedia→result).
   - `messagesModal.js` — wrapper fino que llama `openTabbedForms`.
3. `core/api.js`: 6 funciones finas `/message/*` instance-scoped.
4. Bodies conformes a swagger: `react{number,id,reaction,fromMe,
   participant}`, `markread{number,id[]}`, `delete{chat,messageId}`,
   `edit{chat,messageId,message}`, `status{id}`,
   `downloadmedia{message}` (objeto JSON crudo del mensaje).

**Migración diferida (deuda registrada, no oculta):** `groupsModal.js`
y `usersModal.js` mantienen su orquestación propia en esta corrida —
funcionan y migrarlos es una corrida aparte (no se toca lo que anda;
evita scope creep). Queda anotado aquí como trabajo pendiente:
*"migrar groups/users a `_shared/tabbedForms.js`"*.

## Alternativas consideradas

- **Copiar la orquestación a messages (3ª vez)**: descartado, ADR 0020.
- **Refactorizar groups+users a la vez que se crea el helper**:
  descartado en esta corrida — amplía el blast radius sobre código que
  funciona; se hace como corrida dedicada. La deuda queda explícita.
- **UI rica para `downloadmedia`**: descartado; el endpoint requiere el
  objeto `Message` crudo (proto/JSON del evento). Se ofrece textarea
  JSON validado + `result` con la URL/base64; suficiente para v1.

## Consecuencias

- Positivas: el patrón queda en **un** lugar reutilizable; Mensajes se
  implementa con un catálogo + wrapper de 6 líneas; sin tocar backend;
  cubre 6 endpoints de mensajes; consistencia visual total (reusa
  seg/field/helpHint/tema).
- Negativas: coexisten temporalmente dos orquestaciones equivalentes
  (helper nuevo vs inline en groups/users) hasta la corrida de
  migración — deuda **declarada**, no silenciosa.
- Neutras: la tarjeta de instancia suma botón "Mensajes".
