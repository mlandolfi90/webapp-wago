---
name: el-crisol
description: >-
  Loop de calidad incorporada (Planificador → Arquitecto → Ingeniero →
  Verificador) que se aplica a TODO cambio de código antes de commitear.
  Úsalo cuando vayas a modificar código que toque contratos, más de un
  archivo, arquitectura, o establezca/rompa un patrón (tier Completo); o
  un cambio trivial single-file/cosmético (fast-path). NO aplica a
  planificar, leer, charlar ni editar docs/.md — solo muerde en
  código→commit. Fuente canónica: ADR 0018.
---

# EL CRISOL — Playbook Portable (Loop de Calidad Incorporada)

> Versión para Claude web (claude.ai). En web NO hay hook de autoenforzado:
> el Crisol acá es **disciplina manual** — vos lo invocás, Claude lo sigue.
> En Claude Code local el hook lo enforza solo. Fuente canónica: ADR 0018.

## Cómo usarlo en web
1. Pegá o subí este documento al inicio del chat.
2. Decí: "Seguí este playbook como El Crisol para todo cambio de código."
3. Claude actúa de líder y simula los carriles (no hay subagentes en web →
   ejecuta los roles secuencialmente, manteniendo independencia: re-lee
   artefactos reales, no su propia prosa del paso anterior).

---

## 1. Cuándo se invoca (tiers)

| Tier | Cuándo | Roles |
|---|---|---|
| **Completo** | Código que toca contratos, >1 archivo, arquitectura, o establece/rompe un patrón | Planificador → Arquitecto → Ingeniero → Verificador (+ Integración si paralelo) |
| **Fast-path** | Trivial: single-file, cosmético, docstring, typo | Planificador (mini) → Verificador |

Planificar, leer, charlar, editar docs/.md: **NO es Crisol**. Solo muerde en código→commit.

## 2. Mapeo de roles (1:1 con lo que ya existe — no inventa roles)

| Paso | Rol | Veredicto | Permisos |
|---|---|---|---|
| **Planificador** | `<dominio>-archaeologist` (mapea → CURRENT-STATE/CALL-GRAPH/IMPACT-MATRIX) + plan | plan, sin código | read-only |
| **Arquitecto** | **Architecture Steward** (Triage→Zoom-out→Veto) | `APPROVE`/`REJECT` (=VETO) | read-only |
| **Ingeniero** | `<dominio>-engineer` (implementa EXACTO lo aprobado) | código staged, NO commitea | writes |
| **Verificador** | `<dominio>-quality-auditor` + archaeologist (revalidación estructural) | `PASS`/`FAIL` | read-only |

Solo `PASS` → commit. `REJECT`/`FAIL` → **vuelve al Planificador** (no hot-patch).

## 3. Adaptación paralela

1. N carriles por dominio en paralelo. Naming `<dominio>-<rol>`, equipos descartables.
2. Archaeologists paralelizan libre (read-only, carpetas propias).
3. **Architecture Steward = compuerta serializada compartida.** Ve TODOS los
   planes ANTES de codear. Emite COLLISION-MAP → marca archivos/contratos
   "calientes" → secuencia carriles que chocan. Poka-yoke: prevenir, no detectar.
4. Engineers NO paralelizan sobre archivos compartidos — el líder los administra.
5. **Verificador de Integración:** tras el doble-gate PASS de CADA carril, una
   verificación del resultado combinado. Recién ahí → commit.

## 4. Reglas duras (jidoka)

- **Independencia operacional:** Arquitecto y Verificador reciben SOLO
  artefactos reales (diff, salida de tests que corren ELLOS) — nunca la prosa
  del paso previo. Trust but verify.
- **Veredicto binario:** APPROVE/REJECT, PASS/FAIL. Sin "casi".
- **FAIL/REJECT → Paso 1.** No hot-patch. Se re-planifica con la corrección.
- **Cero scope creep:** el Ingeniero hace SOLO lo aprobado.
- **Commit solo tras PASS** (+ PASS de Integración si hubo paralelo).
- **Techo de loop = 3 iteraciones.** Si tras 3 ciclos no converge → escala al
  humano con la divergencia exacta. No ciclar infinito.
- **REGLA DE ORO #1 — Gate de crédito técnico:** FAIL si el cambio toca
  arquitectura y NO deposita ADR/annotation/IMPACT-MATRIX.
- **REGLA DE ORO #2 — Código factorizado:** FAIL si el entregable es
  monolítico. Todo código debe estar factorizado profesionalmente
  (módulos cohesivos, responsabilidad única, sin archivos cajón de
  sastre). Fuente: ADR 0020.
- **Blameless:** la falla se asume inevitable; surface honesto + corrección
  sistémica. No se culpa, se corrige y se registra.

## 5. Run-ledger (memoria del proceso + llave del enforcement)

Cada corrida se registra. En local el hook lee este ledger: sin `STATUS:
ACTIVE` para el branch, el código queda bloqueado. En web es disciplina manual.

## 6. Procedimiento (líder)

1. Clasificar tier (completo / fast-path).
2. Abrir entrada en RUN-LEDGER: STATUS: ACTIVE, branch, tier, alcance, carriles.
3. Spawnear archaeologists (paralelo) → plan(es) accionable(s).
4. Pasar TODOS los planes al Architecture Steward → COLLISION-MAP +
   APPROVE/REJECT. REJECT → volver a 3 (cuenta iteración).
5. Spawnear engineers por carril respetando la serialización del COLLISION-MAP.
6. Cada carril → quality-auditor + archaeologist (PASS/FAIL sobre estado real).
   FAIL → volver a 3 (cuenta iteración).
7. Si hubo paralelo → Verificador de Integración sobre el combinado.
8. Todo verde → commit. Cerrar ledger: STATUS: CLOSED + veredictos + iteraciones.
9. Iteraciones > 3 sin converger → STATUS: ESCALATED + reportar al humano.

## Vocabulario ancla (cero jerga inventada)
Cero Defectos (Crosby) · Jidoka/calidad incorporada (Toyota) · Defensa en
profundidad · corrección blameless (Edmondson).

---

## PLANTILLA — RUN-LEDGER (verbatim)


```
## RUN <run-id>
STATUS: ACTIVE | CLOSED | ESCALATED | BOOTSTRAP
Branch: <git-branch>
Tier: completo | fast-path
Alcance: <descripción corta>
Carriles: <dominio-A>, <dominio-B>
Planificador: <veredicto/resumen>
Arquitecto: APPROVE | REJECT (motivo)
Ingeniero: <archivos staged>
Verificador: PASS | FAIL (defecto archivo:línea)
Integración: PASS | FAIL | N/A
Iteraciones: <n>/3
Escalación: <none | detalle al humano>
Cierre: <YYYY-MM-DD HH:MM> <commit-sha>
```


- ACTIVE → corrida abierta; el código puede mutarse.
- CLOSED → cerrada con commit; nuevas mutaciones requieren nueva corrida.
- ESCALATED → superó el techo (3 iter); decide el humano.
- BOOTSTRAP → excepción declarada (creación del propio Crisol).

---

## PLANTILLA — COLLISION-MAP (reconstruida del diseño)


```
# COLLISION-MAP — corrida <run-id>

## Carriles en juego
| Carril (dominio) | Alcance | Archivos que toca |
|---|---|---|
| <dom-A> | ... | ... |
| <dom-B> | ... | ... |

## Superficies calientes (tocadas por >1 carril o compartidas)
| Superficie (archivo/contrato) | Carriles | Tipo | Resolución |
|---|---|---|---|
| <archivo/contrato> | A, B | BREAKING/COMPATIBLE/SHARED | <serializar | congelar contrato | líder administra> |

## Contratos congelados (interface compartida — ley para todos los carriles)
<endpoint/método/shape exacto que ambos carriles respetan sin esperarse>

## Secuencia de serialización
1. <qué se congela/define primero>
2. <qué carril arranca>
3. <qué carril espera a cuál y por qué>
4. <si superficies aisladas → paralelo>

## Veredicto del Steward
APPROVE | REJECT (motivo exacto archivo:concepto + corrección estructural)
```


---

## CHECKLIST — Verificador (reconstruido del diseño; binario PASS/FAIL)

**A. Funcional / tests**
- [ ] Tests nuevos cubren el cambio; suite del repo en verde (corrida por el verificador, no reportada).
- [ ] Cobertura ≥ umbral del proyecto. Linter + type-checker estrictos limpios en la superficie tocada.
- [ ] Cero regresión en tests existentes.

**B. Cero deuda técnica**
- [ ] Cambio completo + factorizado + testeado + documentado. Sin "después lo limpiamos".
- [ ] Sin scope creep: SOLO lo aprobado por el Arquitecto.
- [ ] Sin backwards-compat hacks, sin código muerto, sin TODOs colgados.

**C. Reglas de oro (fallas duras)**
- [ ] #1: Si tocó arquitectura/contrato/patrón → depositó ADR/annotation/IMPACT-MATRIX.
- [ ] #1: Oportunidad de crédito técnico no aprovechada = **FAIL automático**.
- [ ] #2: Entregable factorizado (módulos cohesivos, responsabilidad única).
      Monolito / archivo cajón de sastre = **FAIL automático**.

**D. Integridad estructural (consulta al archaeologist)**
- [ ] El archaeologist revalidó: sin acoplamiento sutil roto, traps del IMPACT-MATRIX preservados.
- [ ] Contratos públicos (AMQP/REST/DB) intactos o versionados.
- [ ] No viola Growth-First ni decisiones congeladas.

**E. Integración (si hubo carriles paralelos)**
- [ ] El resultado combinado pasa (lo que pasa aislado puede fallar junto: CI serial, archivos compartidos).
- [ ] COLLISION-MAP respetado; serialización cumplida.

**Veredicto:** PASS (todo ✓) | FAIL (cualquier ✗ → vuelve al Planificador, cuenta iteración).
