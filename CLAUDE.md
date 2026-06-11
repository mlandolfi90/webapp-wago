# WebAPP-Wago — Notas para Claude

API REST de WhatsApp en Go (deriva de Evolution Go bajo Apache 2.0) +
panel React (`manager-src/` → buildea a `manager/dist`, servido en
`/manager`) + MCP server (74 tools, binario `wago-mcp` en la misma
imagen Docker).

## Punto de entrada para una sesión nueva

Antes de tocar código o desplegar, leer:

1. **`docs/notes/0017-deploy-prompt.md`** — prompt copy-paste con features,
   endpoints, tools MCP críticas y reglas de operación. Es el resumen
   actual del estado de wago.
2. **`docs/notes/README.md`** — índice de notas técnicas (stack guide,
   security debt, upstream sync, MCP human reply, etc.).
3. **`docs/adr/README.md`** — índice de ADRs (decisiones arquitectónicas).
4. **`docs/adr/RUN-LEDGER.md`** — memoria de las corridas del Crisol.

Stack actual: React 18 + Vite 7 + Tailwind 4 + Radix + `@evoapi/design-system`
en `manager-src/` (ADR 0053 revierte el vanilla de 0019; ADR 0054 define
estructura). Single-tenant (multi-tenant bloqueado por checklist en
`docs/notes/0011-security-debt-deferred.md`).

## OBLIGATORIO: El Crisol (loop de calidad)

Para **todo cambio de código antes de commitear** se aplica el playbook
**crisol** (skill `lucky-skills`): Planificador → Arquitecto
→ Ingeniero → Verificador, veredicto binario, commit solo tras PASS. Tier
Completo si toca contratos/arquitectura/>1 archivo/patrón; fast-path si es
trivial. Planificar, leer, charlar o editar docs/.md **no** dispara el Crisol.
Dos REGLAS DE ORO (FAIL automático): #1 crédito técnico → ADR ante cambio
arquitectónico (ADR 0018); #2 código factorizado, sin monolitos (ADR 0020).
Fuente canónica: ADR 0018.

## Submódulo obligatorio: whatsmeow-lib

`whatsmeow-lib/` es un submódulo git. `go.mod` lo usa vía `replace` y el
`Dockerfile` lo copia. Sin él, **cualquier build falla** con
`reading whatsmeow-lib/go.mod: no such file or directory`.

- Clonar con: `git clone --recurse-submodules ...`
- Si falta: `git submodule update --init --recursive`
- `make deps`, `make submodules` y `make docker-build` ya lo inicializan solos.

## Build de Go: SIEMPRE con caché (evitar rebuilds largos)

El primer build de Go es lento (baja todas las deps + compila CGO con
libwebp/libjpeg). Para no comerse ese lapso en cada build, el repo usa
caché persistente. **No buildear con `docker build` plano** — eso pierde
la caché. Convención:

- `make docker-build` → usa `docker buildx` con un builder dedicado
  persistente (`webapp-wago-builder`) + BuildKit cache mounts del
  `Dockerfile` (`/go/pkg/mod` y `/root/.cache/go-build`).
- `make buildx-setup` crea el builder (idempotente).
- `DOCKER_BUILDKIT=1` se exporta desde el Makefile.
- El `Dockerfile` tiene `# syntax=docker/dockerfile:1` y
  `RUN --mount=type=cache,...` — no quitar esas líneas.
- Para `docker compose`: el compose de ejemplo tiene `build:`; correr con
  `DOCKER_BUILDKIT=1 docker compose up -d --build` para aprovechar la caché.

Regla: si vas a tocar el flujo de build, **preservá los cache mounts y el
builder buildx**. Son intencionales para evitar rebuilds de minutos.

## Levantar

```bash
git clone --recurse-submodules https://github.com/mlandolfi90/webapp-wago.git
cd webapp-wago/docker/examples
docker compose up -d --build
```

Panel: http://localhost:4000/manager — cambiar `GLOBAL_API_KEY` antes de exponer.

## Estilo de respuesta y cierre de turno

**Regla 1 — Formato pro/contra, 20 palabras por explicación**

- Cada punto importante se presenta como **Pro** y **Contra** separados.
- **Máximo 20 palabras** por explicación (default permanente).
- Si el usuario pide detalle: hasta **100 palabras** por el detalle solicitado
  (o la cantidad de palabras que indique el usuario).
- En la **siguiente respuesta**, volver al default de 20 palabras.

**Regla 2 — Cierre con propuesta del siguiente paso lógico**

- Si queda algo pendiente, terminar con una **propuesta concreta del siguiente
  paso lógico** según el contexto del repo y las ejecuciones previas.
- Formato: pregunta accionable (no genérica "¿algo más?").
  Buenas: "¿Procedo con ADR 0002 de deploy?", "¿Dockerizo el build ahora?".
  Malas: "¿Te ayudo en algo más?", "¿Querés que siga?".
- Si la tarea está cerrada y no hay follow-up natural, no se fuerza pregunta.

<!-- crisol-adoptado -->
## Ley del repo — Crisol (lucky-skills)

Este repo está bajo el Crisol. Al iniciar sesión: correr la skill **brujula**
(ancla al estado real). Antes de tocar código: **/crisol** — la skill verifica
su propia vigencia al invocarse (Ley viva). Fuente de verdad del proceso:
`github.com/mlandolfi90/lucky-skills` (último tag).
