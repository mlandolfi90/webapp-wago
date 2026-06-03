# Crisol — Contexto y fundamento (no es procedimiento)

> Leer solo si necesitás entender *por qué* el Crisol es como es. El SKILL.md es
> la parte accionable; esto es el respaldo histórico/conceptual.

## Metáfora
Un crisol funde y quema impurezas bajo presión hasta dejar metal puro. Eso hace
el Crisol con los defectos de un cambio de código.

## Vocabulario ancla (cero jerga inventada)
- **Cero Defectos** — aspiración (Crosby)
- **Jidoka / calidad incorporada** — mecanismo (Toyota)
- **Defensa en profundidad** — ya usado en el proyecto
- **Corrección blameless** — la falla se asume inevitable; se corrige el sistema, no se culpa (Edmondson)

## Fuente canónica
ADR 0018 (`docs/decisions/0018-crisol-loop-calidad-incorporada.md`). El Crisol
**no inventa roles**: formaliza el Three-Agent Loop (ADR 0007) + el Architecture
Steward, los endurece, los hace paralelos, gateados y enforzados.

## Mapeo canónico de roles (1:1 con lo que ya existe)

| Paso | Rol del proyecto | Veredicto | Permisos |
|---|---|---|---|
| **Planificador** | `<dominio>-archaeologist` (mapea CURRENT-STATE/CALL-GRAPH/IMPACT-MATRIX + plan accionable) | plan, sin código | read-only |
| **Arquitecto** | **Architecture Steward** (Triage → Zoom-out → Gate de Veto) | `APPROVE` / `REJECT` (🚨 VETO) | read-only |
| **Ingeniero** | `<dominio>-engineer` (implementa EXACTO lo aprobado) | código *staged*, NO commitea | writes |
| **Verificador** | `<dominio>-quality-auditor` **+** archaeologist (revalidación estructural) | `PASS` / `FAIL` | read-only |

## Run-ledger = ADR 0010 aplicado al meta-proceso
Self-awareness: el sistema acumula su historial de calidad, no solo el código.

## Bootstrap (honesto)
El Crisol no pudo dogfoodearse en su propia creación (el loop aún no existía).
Esa meta-implementación se revisó directo con Lucky-Admin + team-lead, con entrada
de ledger `BOOTSTRAP`. El primer dogfood real = el siguiente cambio de código
tras existir el Crisol.
