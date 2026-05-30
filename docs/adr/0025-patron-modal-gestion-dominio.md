# 0025 - Patrón de modal de gestión de dominio (Grupos)

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: webui-groups-001 (tier completo)

## Contexto y problema

La webui exponía instancias + envío, pero no la gestión de **grupos**
(10 endpoints `/group/*`). Un grupo no es "un formulario": es una
entidad con lista, creación, ingreso y ~7 operaciones por entidad
(info, link, nombre, descripción, foto, participantes, salir). Meter
todo en un modal plano sería un monolito.

## Decisión

Se establece el **patrón "modal de gestión de dominio"**, reutilizable
para futuros dominios (usuarios, etiquetas, newsletters):

- `features/instances/groups/groupsModal.js` — **orquestador** con un
  `seg` (segmented, ADR 0023) de 3 pestañas: *Mis grupos* (lista +
  acción por entidad), *Crear grupo*, *Unirme por link*. Agnóstico a las
  operaciones por-grupo.
- `features/instances/groups/groupActions.js` — **catálogo declarativo**
  `GROUP_ACTIONS` (mismo estilo que `senders.js`, ADR 0023): cada acción
  `{ id, label, build(group)->{fields,validate,body}, api, result?,
  confirm?, reload? }`. `openGroupActions(inst, group, onChanged)` abre
  un sub-modal con `seg` de acciones; el orquestador agrega `groupJid`.
  - `result?`: si la acción devuelve datos (info, link de invitación),
    los renderiza en el modal en vez de cerrarlo (texto seleccionable).
  - `confirm?`: gate para acciones destructivas (salir del grupo).
  - `reload?`: tras éxito, recarga la lista (nombre, participantes…).
- `core/api.js`: 10 funciones finas `/group/*` (mismo patrón que
  `send*`/`sendMedia`), instance-scoped (`apikey` = token de instancia).
- Reusa `modal`, `field`, `helpHint` (ADR 0022), `seg`/tema (ADR 0021/
  0023). Cero CSS nuevo.

El listado se renderiza **defensivo**: el shape de `/group/list` (proto
whatsmeow) no está garantizado → `groupLabel`/`groupJid` prueban
múltiples claves (`JID/jid/id`, `Name/Subject/...`) y siempre muestran
el JID; vacío/erróneo cae a estado "empty".

## Alternativas consideradas

- **Un modal plano con todos los campos de grupo**: descartado
  (monolito, ADR 0020).
- **Un modal distinto por operación (10 `openXModal`)**: descartado;
  duplica armazón y dispersa el dominio.
- **Asumir el shape exacto de `/group/list`**: descartado; el backend
  reenvía structs de whatsmeow no documentados en swagger (solo
  `gin.H`). Render defensivo evita romper ante claves inesperadas.
- **`/group/myall`**: excluido (marcado *not working* en `routes.go`).

## Consecuencias

- Positivas: cubre los 10 endpoints útiles de grupos; patrón replicable
  para los próximos dominios (orquestador tabs + catálogo declarativo de
  acciones por entidad); reusa todo lo anterior; sin tocar backend; sin
  CSS nuevo.
- Negativas: `result` de *info* muestra JSON crudo (el shape real no es
  conocido; legible pero no "bonito") — aceptable como primera versión,
  mejorable cuando se confirme el contrato real.
- Neutras: la tarjeta de instancia suma un botón "Grupos"
  (`instanceCard.js`).
