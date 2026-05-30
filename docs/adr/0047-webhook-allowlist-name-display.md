# 0047 - Webhook allowlist: display `Nombre <JID>` (RFC 5322)

- Estado: aceptado
- Fecha: 2026-05-27
- Corrida Crisol: webhook-filter-name-display-001 (tier completo,
  carril webui)

## Contexto

ADR 0046 dejó las allowlists `chatIds`/`senders` mostrando **solo
JIDs crudos** (numéricos: `120363...@g.us`). El picker llenaba JIDs
puros, y al editar un webhook existente había que leer los números
para saber qué grupo o contacto era. UX pobre — el JID es identidad
técnica, no humana.

## Decisión

Las allowlists se muestran y escriben como **`Nombre <JID>`** (estilo
RFC 5322 — el mismo que usan emails, git authors, `From:` headers).
El backend **no cambia**: sigue recibiendo y persistiendo solo el JID.

### Reglas

- **Picker (`jidPicker.js`)** escribe `Nombre <JID>` al append (o
  `<JID>` si no hay nombre).
- **Prefill (edit)**: al abrir el form con un webhook existente, se
  llama `loadNameMap(token)` (async) y se reescriben las textareas
  con los JIDs enriquecidos. Si no se encuentra nombre o es un
  wildcard, queda crudo (`*@g.us`, `549*@s.whatsapp.net`).
- **Guardar** (`build()`): `parseTextareaToJids` extrae **solo el
  JID** de cada línea via regex `/<([^>]+)>/`, con fallback a la
  línea cruda (preserva wildcards y JIDs tipeados a mano).

### Componente nuevo: `nameResolver.js`

- `loadNameMap(token) → Promise<{ jid → name }>`: hace UN solo fetch
  por token (singleton via `Map<token, Promise>`) llamando
  `/group/list` + `/user/contacts` en paralelo; tolera errores
  parciales (devuelve el map con lo que llegó).
- `formatJid(jid, map) → "Nombre <JID>" | jid`.
- `parseLineToJid(line) → JID` con fallback a línea cruda.
- `parseTextareaToJids(ta) → string[]`.

## Alternativas consideradas

- **`JID (Nombre)`** (estilo agenda telefónica): rechazado por el
  usuario; el JID como primario y el nombre como nota se sentía
  invertido.
- **Chips visuales** (componente custom reemplaza la textarea):
  rechazado — requiere reescribir el control, perder fácil copy/paste
  y edición multilínea, sin ganar capacidad real. El picker ya cubre
  la entrada por nombre.
- **Resolver nombres en el backend** y devolverlos en la respuesta
  del GET: descartado. Sería un nuevo eje en el contrato REST, costo
  runtime por evento, y la información ya está disponible en el
  cliente (`/group/list` + `/user/contacts` son endpoints existentes
  y livianos).

## Consecuencias

- **Positivas**: identificación humana inmediata en allowlists, en
  creación y edición; cero cambio de contrato REST (backend sigue
  parseando JIDs en `chatIds`/`senders`); wildcards intactos.
- **Negativas**: ninguna en código. Si el usuario edita manualmente
  una línea con sintaxis rota (`Mauro <` sin cerrar), `parseLineToJid`
  devuelve la línea cruda — el backend luego rechazará al no parsear
  como URL/JID válido. Aceptable: error visible al guardar.
- **Neutras**: extiende ADR 0046 (picker) sin reescribirlo; el
  `nameResolver` queda reusable si en algún momento otras vistas
  necesitan resolver JIDs por nombre (hoy nadie más lo usa).
