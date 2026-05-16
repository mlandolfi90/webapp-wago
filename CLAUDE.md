# WebAPP-Wago — Notas para Claude

API REST de WhatsApp en Go (deriva de Evolution Go). UI ya compilada en
`manager/dist`, servida en `/manager`.

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
