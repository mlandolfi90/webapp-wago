# 0044 - Fix: contrato profileName/profileStatus (MCP + webui)

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: profile-name-status-fix-001 (tier completo, 2 carriles
  serializados: mcp-internal + webui)

## Contexto

Bug confirmado en repo-organize-001 (ADR 0043, registrado en RUN-LEDGER
PENDIENTES). El backend es la verdad del contrato:

- `/user/profileName`  → `SetProfileNameStruct{ Name string json:"name" }`
  → `client.SetGroupName(ctx, EmptyJID, data.Name)`
- `/user/profileStatus`→ `SetProfileStatusStruct{ Status string json:"status" }`
  → `client.SetStatusMessage(ctx, data.Status)`
- `/user/profilePicture`→ `SetProfilePictureStruct{ Image string json:"image" }`
  (correcto, no se toca)

Pero los dos callers mandaban `{image}` también a name/status:

- MCP `internal/mcp/tools_user.go`: `wago_profile_name` y
  `wago_profile_status` enviaban `map{"image": v}`.
- webui `users/userForms.js`: `pname` y `pstatus` con
  `body: () => ({ image: ... })`.

Gin hace `ShouldBindJSON` sin `binding:"required"` → la clave `image`
se ignora y `Name`/`Status` quedan **string vacío**: cambiar el nombre o
el estado desde MCP/webui los **borraba** silenciosamente. ADR 0027
asumió mal el contrato.

## Decisión

Alinear solo los callers al contrato backend ya existente (el backend
NO se toca: es la verdad):

1. MCP: `profileName` → body `{"name": v}`; `profileStatus` →
   `{"status": v}`. `profilePicture` queda `{"image": v}`.
2. webui: `pname` → `{ name }`; `pstatus` → `{ status }`. `ppic` queda
   `{ image }`.
3. Test de regresión `TestProfileToolsUseBackendContractKeys`
   (`internal/mcp/tools_test.go`): levanta httptest, ejecuta los 3 tools
   y afirma que el body tiene **exactamente** la clave esperada
   (`name`/`status`/`image`) — fija el contrato para que no vuelva a
   divergir.

Cero scope creep: no se renombró el arg MCP `value`, no se tocó
`profile_picture`, no se refactorizó nada más.

## Alternativas consideradas

- Cambiar el backend para aceptar `{image}` en name/status: descartado.
  El backend es coherente y compartido (REST, swagger, ADR 0027 a
  corregir en doc); el defecto está en los callers, ahí se corrige.
- Renombrar el arg de entrada MCP de `value` a `name`/`status`:
  descartado, es cambio de API del MCP sin valor (el arg de usuario es
  ortogonal al body REST) y sería scope creep.

## Consecuencias

- Positivas: cambiar nombre/estado desde MCP y webui ahora funciona;
  test de contrato evita regresión; `profilePicture` sin cambios.
- Negativas: ninguna en código. Validación en dispositivo real (efecto
  visible en WhatsApp) queda como verificación externa al sandbox —
  pero el contrato está fijado por test estático.
- Neutras: ADR 0027 queda corregido por este ADR (su supuesto del
  contrato era erróneo); índice ADR 0018→0044.
