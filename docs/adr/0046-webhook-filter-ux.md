# 0046 - Webhook filter: wildcards en JID + selector por nombre en UI

- Estado: aceptado
- Fecha: 2026-05-27
- Corrida Crisol: webhook-filter-ux-001 (tier completo, 2 carriles
  disjuntos: backend + webui)

## Contexto

ADR 0045 dejó los filtros de webhook con allowlists de **JIDs exactos**.
Dos casos comunes quedaban incómodos:

1. "Todos los grupos" / "todos los individuales" / "todos los del país
   549" — exigía listar JIDs uno por uno.
2. "Estos 3 grupos por nombre" — el usuario tiene que conocer el JID
   numérico (`120363...@g.us`) en lugar de elegir por nombre humano
   ("Harness Pruebas").

## Decisión

Dos cambios complementarios, sin tocar el contrato REST:

### A) Wildcards (glob) en allowlists — backend

`matchAllowlist` en `pkg/webhook/service/webhook_service.go` ahora
soporta patrones glob estilo shell vía `path.Match` (stdlib).
Detecta metacaracteres con `strings.ContainsAny(a, "*?[")`; sin
metacaracteres, sigue siendo **exact match** (retrocompat 100%).

Ejemplos:
- `*@g.us` — todos los grupos
- `*@s.whatsapp.net` — todos los individuales
- `549*@s.whatsapp.net` — autores argentinos
- `12036*@g.us` — grupos con prefijo

Semántica crítica preservada: `jid==""` **antes** del loop → el `*`
no puede dar bypass cuando falta el dato.

Cobertura de tests: 7 casos nuevos en `TestMatchesFilter`
(grupos `*@g.us`, prefijo `549*`, edge case del `*` con jid vacío,
glob+exact mixto, etc.).

### B) Selector por nombre en la webUI

Nuevo helper `manager/dist/assets/js/features/instances/webhooks/jidPicker.js`
con `mountJidPicker({host, source, token, targetTextarea, onClose})`:

- `source: "groups"` llama `listGroups(token)` (= `GET /group/list`) y
  muestra checkboxes por **nombre humano** (`GroupName.Name`) con el
  JID muted abajo.
- `source: "contacts"` llama `getContacts(token)` (= `GET /user/contacts`)
  y muestra checkboxes por nombre (`FullName`/`PushName`/`BusinessName`).
- Input de búsqueda por nombre o JID.
- Al confirmar, **append** de los JIDs seleccionados a la `textarea`
  destino, deduplicado (`Set`), uno por línea.

Se monta inline dentro del form de edición (no es un modal anidado).
Si no se pasa `token` a `buildWebhookForm`, los botones no aparecen
(degrada limpio).

## Alternativas consideradas

- **Filtro por NOMBRE en el backend** (campos `chatNames`/`senderNames`
  con glob sobre nombre): descartado. Exigiría lookup de nombre de
  grupo por cada evento (vía `client.Store` o `GetGroupInfo` remoto),
  cache + invalidación adicional, y un nuevo eje en el contrato. Con
  el selector UI (B), el usuario elige por nombre pero el backend
  sigue filtrando por JID — costo runtime cero, mismo UX.
- **`filepath.Match`** en vez de `path.Match`: ambos hacen lo mismo
  en Linux; `path.Match` no depende del SO y los JIDs no llevan `/`,
  así que es la opción correcta.
- **Patterns regex** en vez de glob: descartado, sintaxis más densa,
  riesgo de ReDoS, sin valor para los casos típicos.

## Consecuencias

- **Positivas**: cubre el 80% de casos masivos con wildcards
  (~15 líneas backend) + el 20% específico con selector por nombre
  (cero superficie nueva en el backend, sólo UI sobre endpoints que
  ya existían). Retrocompat 100%.
- **Negativas**: ninguna en código. La validación del input del
  webhook NO valida que los JIDs en la allowlist tengan formato
  válido — pero es deliberado: aceptamos globs (`*@g.us`).
- **Neutras**: extiende ADR 0045 sin reescribirlo; el contrato REST
  sigue idéntico.
