# 0043 - Organización del repo: limpieza, índices y vetos del Steward

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: repo-organize-001 (tier completo, 5 carriles paralelos
  de auditoría read-only → consolidación del Architecture Steward)

## Contexto

Pedido: organizar el repo, ordenar docs, actualizar todo y eliminar
basura. Se corrieron 5 archaeologists read-only en paralelo (backend Go,
MCP/internal, webui, documentación, infra/raíz). El Steward consolidó y
filtró: ejecutar solo lo de **bajo riesgo y alto valor**; lo demás se
**veta** y se registra como deuda.

## Decisión — qué SÍ se hizo

1. **Borrado de código muerto comentado** (3 bloques, ~30 líneas;
   build/vet/test verdes):
   - `pkg/utils/utils.go` (proxy SOCKS5 comentado tras `return`)
   - `pkg/instance/service/instance_service.go` (if/else + sleep
     comentados)
   - `pkg/whatsmeow/service/whatsmeow.go` (bloque profilePic comentado)
2. **Organización de documentación**:
   - Nuevo `docs/README.md` (índice maestro).
   - Nuevo `docs/adr/README.md` (índice ADR 0018→0043 + aclaración de
     que RUN-LEDGER no es ADR y no se mueve).
   - `README.md`: tabla "Key endpoints" obsoleta (`/message/sendText`…)
     reemplazada por atajos reales + puntero a MANUAL.
   - `COMMANDS.md`: link roto `docs/wiki/README.md` → `docs/README.md`.
3. **`.gitignore`**: + `*.out`, `/server`, `/wago-mcp`, `*.test`
   (binarios/artefactos locales).

## Vetos del Steward (NO se hizo; documentado)

- **Mover RUN-LEDGER a `docs/`**: VETO. Es convención de El Crisol
  (ADR 0018) y referencia del skill/CLAUDE; moverlo rompe el proceso.
- **`.gitignore` de `manager/dist/` y `docs/swagger.*`/`docs.go`**:
  VETO. NO son basura: `manager/dist` es la UI servida (fuente, no
  build); los swagger/docs.go los **embebe el build** (`import _
  ".../docs"`) y los usa Dockerfile/CI. Ignorarlos rompería build y UI.
- **Refactor de monolitos** (`send_service.go` 2960 líneas,
  `whatsmeow.go` 2708) y dedup `formatBR/MX`: real pero alto riesgo y
  sensible a comportamiento → fuera de una corrida de limpieza. Deuda
  registrada (RUN-LEDGER §PENDIENTES).
- **"Fix" MCP profileName/status**: el agente MCP lo marcó como bug.
  **Es bug REAL** (confirmado: backend usa `SetProfileNameStruct{name}`
  y `SetProfileStatusStruct{status}`, no `image`; MCP y webui envían
  `{image}` → setean vacío; ADR 0027 lo asumió mal). Pero su corrección
  toca contratos en 2 capas → **corrida propia** (disciplina
  anti-scope-creep, igual que ADR 0037). Registrado en PENDIENTES.

## Alternativas consideradas

- Ejecutar todo lo que sugirieron los 5 agentes: descartado; varios
  hallazgos eran incorrectos (gitignore de artefactos críticos) o de
  alto riesgo (refactors). El Steward filtra: poka-yoke, no "aplicar
  todo".
- Hacer el fix de profileName aquí: descartado; mezclar un fix de
  contrato en una corrida de organización viola "cero scope creep".

## Consecuencias

- Positivas: repo más limpio (cero código muerto comentado en 3
  servicios), documentación con índice navegable y refs correctas,
  `.gitignore` endurecido sin romper nada; build/UI intactos.
- Negativas: quedan monolitos y un bug de profile name/status — ahora
  **explícitos y registrados**, no ocultos.
- Neutras: 5 auditorías quedan resumidas acá; los reportes crudos no se
  versionan (ruido), su destilado vive en este ADR + PENDIENTES.
