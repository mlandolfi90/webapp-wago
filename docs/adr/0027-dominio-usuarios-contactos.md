# 0027 - Dominio Usuarios/Contactos (reuso del patrón + load/result)

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: webui-users-001 (tier completo)

## Contexto y problema

Faltaba en la webui el dominio Usuarios/Contactos (12 endpoints
`/user/*`). Además, el usuario quería ver explícitamente **nombre +
teléfono + LID/JID** de cada contacto (preocupación LID, ADR 0026). Es
el segundo dominio "de gestión": valida si el patrón de ADR 0025
(orquestador de pestañas + catálogo declarativo) se reusa sin
deformarse, o si era específico de grupos.

## Decisión

Se **reutiliza el patrón de ADR 0025** para un dominio nuevo, en
`features/instances/users/`, con tres módulos cohesivos:

- `usersModal.js` — orquestador con `seg` de pestañas. Rutea: pestañas
  *lista* (Contactos, Bloqueados) → `contactsList`; pestañas *formulario*
  → catálogo `USER_FORMS`. Submit/estado genéricos.
- `contactsList.js` — pestañas de listado: contactos y bloqueados con
  `identityBlock` (nombre + teléfono derivado del JID + JID copiable) y
  acción block/unblock.
- `userForms.js` — catálogo declarativo `USER_FORMS` (estilo
  `senders.js`/`groupActions.js`) para verificar, info, avatar,
  privacidad y perfil (nombre/estado/foto).

**Extensión del patrón** (mínima, retrocompatible): las entradas de
catálogo aceptan dos campos opcionales nuevos:
- `load(token) -> Promise(data)`: precarga estado del servidor antes de
  construir el form (usado por *Privacidad*: GET `/user/privacy` →
  prefill de selects → POST). El orquestador llama `build(prefill)`.
- `result(data, areaEl)`: ya existía la idea en groups; aquí se
  generaliza para *Verificar* (lista de `identityBlock` con
  **LID/JID**), *Info* (JSON) y *Avatar* (imagen + URL copiable).

Endpoints instance-scoped; 12 funciones finas nuevas en `core/api.js`.
`/user/profileName|Status|Picture` reciben el contrato real
`SetProfilePictureStruct{image}` → el body usa la clave `image` para los
tres (confirmado en el backend). Render **defensivo** de
`/user/contacts`, `/user/check`, `/user/blocklist` (shapes proto/store
no garantizados en swagger): se prueban múltiples claves y se cae a
"empty".

## Alternativas consideradas

- **Un patrón distinto por dominio**: descartado; ADR 0025 ya definió el
  patrón, reusarlo prueba su valor y evita divergencia.
- **Un módulo único para todo Usuarios**: descartado (monolito,
  ADR 0020). Se separó listas vs formularios vs orquestador.
- **Mostrar solo el número y ocultar LID**: descartado; contradice
  ADR 0026 (LID visible y copiable, nombre protagonista).
- **Hardcodear el enum de privacidad**: se usa el conjunto real de
  `PrivacySetting` del swagger, con `""` = "(sin cambiar)".

## Consecuencias

- Positivas: cubre los 12 endpoints de usuario; el patrón de ADR 0025
  queda **validado y extendido** (`load`/`result`) sin romper groups;
  *Verificar* responde directo la duda del LID (nombre + teléfono + LID
  copiable con `identityBlock`); sin tocar backend; reusa todo
  (modal/seg/field/helpHint/identity/tema).
- Negativas: *Info* muestra JSON crudo (shape real no garantizado);
  aceptable como v1, mejorable al confirmar contrato. Muchas pestañas
  (9) — el `seg` las envuelve, pero a futuro podría agruparse.
- Neutras: la tarjeta de instancia suma botón "Contactos".
