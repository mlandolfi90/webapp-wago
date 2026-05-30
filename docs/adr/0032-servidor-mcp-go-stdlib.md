# 0032 - Servidor MCP en Go (stdlib-only) que envuelve la API REST

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: mcp-server-001 (tier completo)

## Contexto y problema

`docs/MCP-WHATSAPP.md` definió el diseño para exponer webapp-wago como
servidor MCP. El usuario priorizó implementarlo. Decisiones tomadas con
el usuario (no se adivinaron): **Go, dentro del repo**; transporte
**stdio + HTTP**. Restricción dura del proyecto (CLAUDE.md): no romper
el build Go con caché, el submódulo whatsmeow ni el Dockerfile.

## Decisión

Servidor MCP **hecho a mano, solo stdlib** (cero dependencias nuevas):

- `internal/wago/client.go` — cliente REST fino: `baseURL`, `adminKey`,
  token de instancia activa en memoria (mutex). `Scope` (Admin|Instance)
  selecciona el header `apikey`. Propaga el envelope `{"error":...}`.
- `internal/mcp/` — protocolo factorizado por archivo:
  `jsonrpc.go` (tipos JSON-RPC 2.0), `server.go` (registry +
  initialize/tools.list/tools.call), `tools.go` (catálogo del núcleo),
  `stdio.go` (transporte stdio, JSON-RPC por línea), `http.go`
  (transporte HTTP: `POST /mcp` request/response + `GET /mcp` SSE
  keep-alive + `/healthz`).
- `cmd/mcp/main.go` — entrypoint; config por env
  (`WAGO_BASE_URL`, `WAGO_ADMIN_KEY`, `MCP_TRANSPORT`, `MCP_HTTP_ADDR`).
- `Makefile`: target `mcp` (reusa GO/flags existentes).

Catálogo del núcleo (13 tools): `wago_instance_create/list` (admin),
`wago_use_instance` (fija token activo), `wago_connect/qr/status`,
`wago_send_text/media/location`, `wago_react`, `wago_mark_read`,
`wago_check_user`, `wago_group_list`. Las credenciales viven en el
proceso; el modelo solo pasa el token vía `wago_use_instance`. Errores
de tool → `content` con `isError:true` (el modelo los ve y maneja), no
error de protocolo.

**Dockerfile: intacto en esta corrida** (decisión deliberada). CLAUDE.md
protege el flujo de build/caché/submódulo; añadir el binario MCP a la
imagen es un follow-up acotado y separado para no arriesgar el build
principal. Documentado como pendiente, no como deuda oculta.

## Alternativas consideradas

- **SDK MCP externo (mark3labs/mcp-go u oficial)**: descartado en esta
  corrida. Suma dependencia a `go.mod` (afecta a todo el módulo que ya
  hace `replace` del submódulo), requiere red para `go mod` y su API no
  está verificada en este entorno. Stdlib-only = build determinista,
  control total, alineado con la higiene de build del proyecto.
- **TypeScript/Node o repo separado**: descartado por el usuario
  (eligió Go en el repo).
- **Solo stdio**: descartado; el usuario pidió ambos transportes.
- **Tocar el Dockerfile ahora**: descartado por riesgo (CLAUDE.md);
  follow-up.

## Consecuencias

- Positivas: cero deps nuevas; no se toca el build principal ni el
  submódulo; factorizado (1 responsabilidad por archivo); extensible
  (agregar tool = una entrada en `tools.go`); ambos transportes.
- Negativas: el transporte HTTP es request/response + SSE keep-alive
  (sin fan-out multi-sesión ni la negociación completa de Streamable
  HTTP); suficiente para el caso, ampliable. No hay cliente MCP real en
  el sandbox → la conformidad fina se valida fuera (ver verificación).
- Neutras: el binario MCP no se distribuye en la imagen Docker todavía
  (follow-up registrado).
