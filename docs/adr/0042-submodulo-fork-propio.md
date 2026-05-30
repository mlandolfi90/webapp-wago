# 0042 - Submódulo whatsmeow repuntado al fork propio

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: submodule-fork-001 (tier completo)

## Contexto y problema

El submódulo `whatsmeow-lib/` apuntaba directo a
`EvolutionAPI/whatsmeow`. Para alimentarse de upstream **sin divergir**
(ADR 0036) hace falta una capa propia: un fork con los parches del
proyecto aislados en una rama, y ambos upstreams (tulir + Evolution)
como remotes para rebasar. El usuario creó el fork
`mlandolfi90/whatsmeow` y la rama `wago-patches` (acciones GitHub-web).

## Decisión

Repuntar el submódulo al fork propio, **sin cambiar el commit fijado**:

- `.gitmodules`: `url = https://github.com/mlandolfi90/whatsmeow.git`,
  `branch = wago-patches`.
- `git submodule sync` + `origin` del submódulo → fork.
- **Gitlink intacto en `0923702`**: verificado que es **ancestro** de
  `wago-patches` (tip `bccc4a2`) en el fork → el commit resuelve, **cero
  cambio de build/comportamiento** (mismo código que ya compilaba).
- `tulir` y `evolutionapi` NO se fijan en `.gitmodules` (no es lo que
  versiona git); se agregan como **remotes del submódulo en el momento
  del sync**, documentado en `docs/UPSTREAM.md` (runbook). Así se
  alimentan **ambos** upstreams.

## Alternativas consideradas

- **Forkear de `tulir` directo**: descartado (ADR analizado con datos):
  el backend depende de parches de Evolution (p.ej. LID en
  `IsOnWhatsApp/GetUserInfo` que alimenta `/user/check`); forkear de
  tulir los perdería. Base = Evolution; tulir se trae por encima.
- **Avanzar el gitlink a `bccc4a2` (tip de wago-patches)**: descartado
  en esta corrida; cambiar el commit es un sync deliberado aparte
  (UPSTREAM.md §A), con su verificación. Acá solo se repunta el origen,
  sin mover el código (poka-yoke: un cambio a la vez).
- **No tener fork (seguir en EvolutionAPI)**: descartado; sin capa
  propia, cualquier parche futuro se perdería en el próximo update
  (ADR 0036).

## Verificación

- `git submodule sync` OK; `origin` del submódulo = fork; gitlink =
  `0923702` (sin cambios); `git status` muestra solo `.gitmodules` (el
  submódulo NO figura modificado → gitlink preservado).
- `go build ./...` verde (mismo árbol del submódulo en disco).
- Ancestría `0923702` ⊂ `wago-patches` verificada con
  `git merge-base --is-ancestor`.
- CI (`ci.yml`) revalida clone con submódulo recursive en el push.

## Consecuencias

- Positivas: capa propia lista; `wago-patches` es donde viven/rebasan
  los parches; ambos upstreams (tulir + Evolution) alimentables vía el
  runbook; cero cambio de build (gitlink quieto).
- Negativas: quien clone necesita acceso al fork público (lo es) y
  `--recurse-submodules` (ya documentado en CLAUDE.md/README).
- Operativo: próximos syncs siguen `docs/UPSTREAM.md §A` (corrida de
  Crisol; el humano aprueba cambios de protocolo).
