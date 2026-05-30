# 0033 - Catálogo MCP completo, factorizado por dominio

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: mcp-tools-ext-001 (tier completo, 2 iteraciones)

## Contexto y problema

ADR 0032 dejó el servidor MCP con 13 tools del núcleo en un único
`tools.go`. Cubrir el resto de la API (≈65 tools) en ese mismo archivo
sería un cajón de sastre (viola ADR 0020).

## Decisión

Se factoriza el catálogo:

- `tools_helpers.go` — helpers compartidos (`schema`, `jsonText`,
  `str/reqStr/strList/num/boolArg`, `pathEsc`, `okJSON`).
- `tools.go` — solo `BuildTools(c)`: agrega los builders por dominio.
- `tools_instance.go` / `tools_send.go` / `tools_message.go` /
  `tools_user.go` / `tools_group.go` / `tools_misc.go` — un builder
  `<dominio>Tools(c) []Tool` por archivo cohesivo (los 13 originales se
  reubicaron en su dominio; no quedó duplicación).

Cobertura: instancia (create/list/delete, proxy set/del [admin], pair/
disconnect/reconnect/logout, advanced get/set, use_instance, connect,
qr, status), envío (text/media/link/location/poll/contact/sticker),
mensajes (react/mark_read/delete/edit/status/downloadmedia), usuario
(check/info/avatar/contacts/blocklist/block/unblock/privacy get-set/
profile name-status-picture), grupos (list/info/invitelink/create/
participant/name/description/photo/join/leave), comunidades, etiquetas
(label/unlabel vía flag `remove`), newsletters, polls, call. Total ≈65.

Sin cambios de `go.mod`, REST ni modelo de credenciales (admin vs token
activo se mantiene en `wago.Scope`). Path-params (`/instance/.../...`,
`/polls/{id}/results`) escapados con `url.PathEscape`.

## Iteraciones (blameless)

1. Implementación + tests.
2. **FAIL** del Verificador: el test `TestPathParamToolBuildsURL`
   asumía el path **decodificado** del servidor; el escaping sí ocurre
   en el cable. Defecto del *artefacto de test*, no del código. Re-plan:
   aserción sobre `r.URL.EscapedPath()`. PASS.

## Alternativas consideradas

- **Todo en `tools.go`**: descartado (cajón de sastre, ADR 0020).
- **Un archivo por tool**: descartado (fragmentación excesiva); el
  agrupamiento por dominio es la unidad cohesiva natural.
- **Tools separadas label vs unlabel**: se unificó en `wago_label_chat`
  / `wago_label_message` con flag `remove` (menos ruido, misma cobertura).

## Consecuencias

- Positivas: API casi completa expuesta como MCP (≈65 tools); módulos
  cohesivos; agregar un dominio = un archivo + una línea en `BuildTools`;
  cero deps nuevas; credenciales y build intactos; tests cubren conteo,
  unicidad, escaping y enforcement de scope.
- Negativas: `wago_send` no incluye envío secuencial/álbum (decisión de
  alcance; el secuencial es UI-side y el álbum es track aparte).
- Neutras: Dockerfile sigue sin tocarse (follow-up de ADR 0032).
