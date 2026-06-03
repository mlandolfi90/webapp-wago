# AUDITOR-CHECKLIST — Verificador del Crisol

> Lo corren **`<dominio>-quality-auditor` + `<dominio>-archaeologist`** (el
> "AMBOS aprueban"). Veredicto binario: `PASS` / `FAIL`. Sin "casi".
> **Independencia operacional:** se evalúa SOLO sobre artefactos reales (diff +
> salida de tests que corre el propio Verificador). NUNCA sobre la prosa del
> Ingeniero. *Trust but verify.*

## Identidad de la corrida
- Carril: `<dominio>` · Branch: `<branch>` · Entrada ledger: `<id>`
- Artefactos recibidos: [ ] diff staged  [ ] salida de tests propia

## A. Correctitud (quality-auditor)
- [ ] Los tests corren y pasan EN ESTA verificación (no se confía en reporte ajeno)
- [ ] Cubre los casos del plan aprobado (no menos)
- [ ] Sin scope creep: NO hay nada fuera de lo aprobado por el Steward
- [ ] Sin regresiones evidentes en lo adyacente

## B. Integridad estructural (archaeologist — revalidación)
- [ ] El diff respeta CURRENT-STATE / CALL-GRAPH / IMPACT-MATRIX del plan
- [ ] No rompe contratos AMQP/REST fuera del alcance declarado
- [ ] Patrones del proyecto respetados (no inventa, no diverge en silencio)

## C. Gate de crédito técnico (REGLA DE ORO)
> Si el cambio toca arquitectura y NO deposita el crédito → `FAIL` automático.
- [ ] ¿Toca arquitectura? → si SÍ, exige al menos uno depositado:
    - [ ] ADR  · [ ] annotation  · [ ] IMPACT-MATRIX actualizada
- [ ] Cambio cosmético/trivial → exento (espejo del Steward)

## Veredicto
- [ ] `PASS` → habilita commit (o pasa a Verificación de Integración si hubo paralelo)
- [ ] `FAIL` → **vuelve al Planificador (Paso 1)**, NO hot-patch. Cuenta iteración.
    - Surface honesto del defecto (blameless): `<qué falló, sistémico>`
    - Corrección sistémica propuesta: `<qué cambiar para que no reincida>`
