# Documentación — WebAPP-Wago

Punto de entrada. Qué es cada cosa y cuándo usarla.

## Referencia de la API

- **[MANUAL.md](./MANUAL.md)** — referencia **completa y al día** de la
  API REST: autenticación (ámbito admin vs token de instancia), ciclo de
  vida de una instancia, catálogo de endpoints por dominio (con bodies),
  eventos en tiempo real, ejemplos `curl` y limitaciones. **Fuente de
  verdad** de rutas (por encima de la tabla del README).
- Swagger en vivo: `http://<host>:<port>/swagger/index.html`
  (generado; ver nota en "Artefactos generados").

## Integración / MCP

- **[MCP-WHATSAPP.md](./MCP-WHATSAPP.md)** — guía de diseño del servidor
  MCP que envuelve la API. La implementación real vive en `internal/mcp`,
  `internal/wago`, `internal/events` y `cmd/mcp` (ver ADR 0032–0035,
  0039, 0041).

## Upstream / mantenimiento

- **[UPSTREAM.md](./UPSTREAM.md)** — runbook para alimentarse de
  `tulir/whatsmeow` y `EvolutionAPI/whatsmeow` sin divergir (fork propio
  `mlandolfi90/whatsmeow` rama `wago-patches`; ver ADR 0036, 0042).

## Decisiones y proceso

- **[adr/](./adr/)** — Architecture Decision Records (0018→…) +
  **[adr/README.md](./adr/README.md)** como índice.
- **[adr/RUN-LEDGER.md](./adr/RUN-LEDGER.md)** — memoria del proceso
  **El Crisol** (una entrada por corrida: veredictos, iteraciones,
  commit) + sección **PENDIENTES**. No es un ADR; vive en `adr/` por
  convención del Crisol (ADR 0018) — no mover.

## Material de apoyo

- **[_ref-album/ALBUM-REF.md](./_ref-album/ALBUM-REF.md)** — contrato
  del protocolo de álbum (aporte del usuario), base de ADR 0038/0039.

## Artefactos generados (versionados a propósito)

`swagger.json`, `swagger.yaml`, `docs.go` se generan con `make swagger`
pero **se commitean** porque el build los embebe (`import _ ".../docs"`)
y el Dockerfile/CI los necesitan. Si cambiás rutas, regenerá con
`make swagger` antes de publicar. **No** agregar a `.gitignore**.
