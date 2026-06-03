---
name: crisol-lucky
description: >-
  El Crisol — Loop de Calidad Incorporada (jidoka) para cambios de código.
  Invocar SOLO de forma explícita ("/crisol" o "corré el Crisol sobre X") ANTES
  de tocar código que afecte contratos, múltiples archivos o arquitectura.
  Orquesta carriles paralelos (Planificador → Arquitecto → Ingeniero →
  Verificador) con compuerta del Architecture Steward, veredictos binarios, techo
  de 3 iteraciones, gate de crédito técnico y run-ledger persistido.
  NO usar para planificar, leer, charlar ni editar docs/.md — solo código→commit.
allowed-tools: Read, Grep, Glob, Bash, Agent, SendMessage, TodoWrite, Write, Edit
---

# El Crisol — Loop de Calidad Incorporada

Tres ejes, sin excepción: **sencillo** (solo proceso), **objetivo** (todo
veredicto es sí/no o PASS/FAIL), **duro** (nada rompe ni deja deuda técnica).

Corre en el **hilo líder** (los subagentes no anidan). El líder lee esta skill y
orquesta los carriles vía Agent Team. El *porqué* y el mapeo de roles están en
`references/contexto.md` — no hace falta para ejecutar.

---

## 1. Tier (clasificación OBJETIVA)

Respondé el checklist. **Cualquier "SÍ" → Tier Completo.** Todos "NO" → Fast-path.

- [ ] ¿Toca un contrato AMQP/REST?
- [ ] ¿Modifica más de 1 archivo de código?
- [ ] ¿Cambia arquitectura, o establece/rompe un patrón?
- [ ] ¿Toca un archivo compartido (`docker-compose.yml`, `.env.example`, etc.)?

| Tier | Roles que corren |
|---|---|
| **Completo** | Planificador → Arquitecto → Ingeniero → Verificador (+ Integración si hay paralelo) |
| **Fast-path** | Planificador (mini) → Verificador |

**No es Crisol:** planificar, leer, charlar, editar docs/.md. El Crisol solo
muerde en código→commit.

---

## 2. Reglas duras (jidoka) — innegociables

- **Anti-romper (REGLA 0):** el Verificador corre los tests ÉL MISMO. Sin verde
  propio → `FAIL` automático. No se confía en reporte ajeno.
- **Independencia operacional:** Arquitecto y Verificador reciben SOLO artefactos
  reales (diff, salida de tests propia) — **nunca** la prosa del paso previo.
- **Veredicto binario:** `APPROVE/REJECT`, `PASS/FAIL`. Sin "casi".
- **`FAIL`/`REJECT` → Paso 1.** No hot-patch. Se re-planifica con la corrección.
- **Cero scope creep:** el Ingeniero hace SOLO lo aprobado por el Steward.
- **Commit solo tras `PASS`** (y `PASS` de Integración si hubo paralelo).
- **Gate de crédito técnico:** si el cambio toca arquitectura y NO deposita
  ADR/annotation/IMPACT-MATRIX → `FAIL`.
- **Techo = 3 iteraciones.** Si Plan↔REJECT/FAIL no converge en 3 ciclos → el
  team-lead **escala a Lucky-Admin** con la divergencia exacta. No ciclar infinito.
- **Blameless:** la falla se asume inevitable; surface honesto + corrección
  sistémica + registro. No se culpa, se corrige.

---

## 3. Paralelo (poka-yoke: prevenir, no detectar)

1. **N carriles por dominio.** Naming `<dominio>-<rol>`, equipos descartables,
   teammates con `model: "opus"`.
2. **Archaeologists paralelizan libre** (read-only, carpetas propias).
3. **Compuerta serializada = Architecture Steward.** Ve TODOS los planes ANTES de
   que cualquier Ingeniero toque código. Emite COLLISION-MAP, marca calientes,
   secuencia los carriles que chocan.
4. **Engineers NO paralelizan sobre archivos compartidos** — los administra el
   líder. Cada engineer corre `git status --short` antes de tocar; si aparece
   M/A, lee el estado real (no asume).
5. **Verificador de Integración:** tras el doble-gate `PASS` de CADA carril,
   verifica el resultado **combinado**. Recién ahí → commit.

---

## 4. Procedimiento (líder)

1. Clasificar **tier** con el checklist §1. Todos NO → fast-path.
2. Abrir entrada en `RUN-LEDGER.md` (`STATUS: ACTIVE`) → plantilla `templates/run-ledger.md`.
3. Spawnear **archaeologists** (paralelo, opus) → plan(es) accionable(s).
4. Pasar TODOS los planes al **Architecture Steward** → COLLISION-MAP
   (`templates/collision-map.md`) + `APPROVE/REJECT`. REJECT → volver a 3 (cuenta iteración).
5. Spawnear **engineers** por carril respetando la secuencia del COLLISION-MAP.
6. Cada carril → **quality-auditor + archaeologist** sobre estado real
   (`templates/auditor-checklist.md`) → `PASS/FAIL`. FAIL → volver a 3 (cuenta iteración).
7. Si hubo paralelo → **Verificador de Integración** sobre el combinado.
8. Todo verde → commit. Cerrar entrada (`STATUS: CLOSED` + veredictos + iteraciones).
9. Iteraciones > 3 sin converger → `STATUS: ESCALATED` + reportar a Lucky-Admin.

---

## 5. Run-ledger (llave del enforcement)

Cada corrida se registra en `docs/refactor/_crisol/RUN-LEDGER.md`. El hook
`hooks/crisol-enforcer.sh` (PreToolUse Edit|Write) lo lee: **sin entrada
`STATUS: ACTIVE` para el branch actual, todo cambio de código fuente queda
bloqueado (exit 2).** Docs/.md quedan exentos. Conectarlo con
`hooks/settings.snippet.json` en `.claude/settings.json`. Abrir/cerrar entrada =
disciplina obligatoria del líder.

---

**Templates:** `templates/collision-map.md` · `templates/run-ledger.md` · `templates/auditor-checklist.md`
**Hook:** `hooks/crisol-enforcer.sh` (+ `hooks/settings.snippet.json`)
**Fundamento / roles:** `references/contexto.md`
