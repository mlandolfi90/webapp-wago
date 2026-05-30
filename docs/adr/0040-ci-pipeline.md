# 0040 - Pipeline de CI (validación automatizada del repo)

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: ci-pipeline-001 (tier completo)

## Contexto y problema

El Crisol corre la verificación manualmente por corrida; faltaba un
gate automatizado por push/PR. Pendiente concreto: validar el
`docker build` completo, imposible en el sandbox (sin daemon). Ya existe
`publish_docker_image.yml` (solo en `main`, hace push de la imagen) —
no cubre validación en ramas/PR.

## Decisión

Nuevo workflow `.github/workflows/ci.yml`, **solo validación** (no push),
en `push` (ramas != main) y `pull_request`. Tres jobs:

- **go**: checkout `submodules: recursive` (whatsmeow-lib público);
  instala deps CGO (`build-essential pkg-config libwebp-dev
  libjpeg-dev`, equivalentes apt del `apk` del Dockerfile);
  `setup-go` con `go-version-file: go.mod` (queda en sync con 1.25.0);
  `go build/vet/test ./...`.
- **webui**: `node --check` sobre `manager/dist/assets/js/**/*.js`
  (mismo chequeo que usa el Verificador del Crisol).
- **docker**: `buildx` + `build-push-action` con `push:false`,
  `cache type=gha`, `build-arg VERSION` (del archivo VERSION). Valida
  que la imagen (incluido `wago-mcp`, ADR 0035) construye — **cierra el
  pendiente** que no se podía probar en el sandbox.

Mirror de las convenciones del workflow de publish (checkout recursive,
buildx, cache gha, VERSION). No se toca `publish_docker_image.yml` ni
código de la app.

## Alternativas consideradas

- **Agregar jobs al `publish_docker_image.yml`**: descartado; ese hace
  push a Docker Hub solo en main; mezclar validación de ramas/PR ahí
  acopla responsabilidades. Workflow separado = cohesión.
- **Solo lint de YAML local, sin CI real**: descartado; el objetivo es
  justamente automatizar lo que el sandbox no puede (docker build).
- **`go test` sin deps CGO**: descartado; `./...` incluye
  `cmd/webapp-wago` (whatsmeow/libwebp CGO) → fallaría sin las libs.

## Verificación (honesta)

- YAML válido (parseado con PyYAML/yq); revisión estática: cada paso
  refleja comandos ya probados verdes localmente
  (go build/vet/test, node --check) y el Dockerfile ya razonado
  (ADR 0035).
- **Auto-validación**: el workflow corre en el push de esta misma
  corrida; su resultado real en GitHub Actions es la prueba definitiva
  (no ejecutable desde el sandbox). Si CI falla, se reabre en corrida
  nueva (criterio Crisol).

## Consecuencias

- Positivas: cada push/PR valida build+vet+test+webui+docker sin
  depender del host del humano; cierra el pendiente de docker build;
  red de seguridad para futuras corridas.
- Negativas: el primer run real puede requerir ajustes (versiones de
  actions, nombres de paquetes apt) — se corrige por corrida si CI
  marca rojo. Documentado como expectativa honesta.
- Neutras: no altera el pipeline de publicación existente.
