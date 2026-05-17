# 0035 - Binario MCP integrado a la imagen Docker

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: mcp-docker-001 (tier completo)

## Contexto y problema

ADR 0032/0034 dejaron el binario MCP fuera de la imagen Docker
(follow-up registrado) por la sensibilidad del build (CLAUDE.md: caché
persistente, builder buildx, submódulo whatsmeow). Tocaba integrarlo sin
romper ese flujo.

## Decisión

Cambio **aditivo** y mínimo en el `Dockerfile`, etapa `build`:

- Nuevo `RUN` que compila `./cmd/mcp` con **`CGO_ENABLED=0`** (stdlib
  puro → binario estático, sirve tal cual en `alpine`), reusando los
  **mismos** `--mount=type=cache` (`/go/pkg/mod` y
  `/root/.cache/go-build`). Es un RUN separado para no alterar la línea
  del build del server principal (CGO=1, libwebp).
- `COPY --from=build /build/wago-mcp .` en la etapa final.
- **`ENTRYPOINT` sin cambios** (`/app/server`): la API sigue siendo el
  proceso por defecto. El MCP se corre con override de entrypoint
  (documentado en comentario del Dockerfile y aquí):
  `docker run --entrypoint /app/wago-mcp -e WAGO_BASE_URL=... -e
  WAGO_ADMIN_KEY=... -e MCP_TRANSPORT=http -p 8089:8089 <img>`.

Invariantes preservadas (verificadas): línea `# syntax=docker/
dockerfile:1`; `/go/pkg/mod` en los 3 RUN que lo usaban; `/root/.cache/
go-build` en los 2 builds; `COPY whatsmeow-lib/`; builder buildx
(Makefile, no se toca).

## Verificación (honesta)

- `CGO_ENABLED=0 go build ./cmd/mcp` ⇒ ELF **estáticamente enlazado**
  OK (idéntico al comando del nuevo RUN).
- Revisión estática de invariantes: intactas.
- **Limitación de entorno**: el sandbox no tiene daemon Docker, así que
  no se ejecutó `docker build`/`--check`. No se afirma que la imagen se
  haya construido. La validación de imagen completa (build con buildx +
  arranque de ambos binarios) queda para CI/host. El cambio es aditivo y
  el comando de build está probado equivalente localmente.

## Alternativas consideradas

- **`CGO_ENABLED=1` para el MCP**: innecesario (no usa CGO); CGO=0 da
  binario estático más chico y sin deps de runtime.
- **Stage de build separado para el MCP**: descartado; reusar la misma
  etapa aprovecha deps/caché ya calientes (un build incremental del MCP
  es trivial); un stage aparte duplicaría `go mod download`.
- **Cambiar ENTRYPOINT a un dispatcher**: descartado; rompería el
  contrato de la imagen (consumidores actuales esperan la API). Override
  de entrypoint es el patrón estándar para multi-binario.
- **Imagen separada para el MCP**: descartado por ahora; un binario en
  la misma imagen es suficiente y evita otra pipeline.

## Consecuencias

- Positivas: la imagen trae `wago-mcp` listo; cero deps nuevas; caché/
  submódulo/builder intactos; ENTRYPOINT y consumidores actuales sin
  cambios (no-regresión de contrato de imagen).
- Negativas: la imagen final pesa un poco más (un binario Go estático);
  validación de imagen completa diferida a CI (limitación de sandbox,
  explícita).
- Neutras: correr el MCP requiere `--entrypoint`/override (documentado).
