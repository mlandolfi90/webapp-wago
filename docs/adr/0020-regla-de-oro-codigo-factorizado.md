# 0020 - REGLA DE ORO: código factorizado y profesional

- Estado: aceptado
- Fecha: 2026-05-16
- Relacionado: ADR 0018 (El Crisol)

## Contexto y problema

El Crisol (ADR 0018) tenía una sola REGLA DE ORO (gate de crédito técnico:
ADR/IMPACT-MATRIX ante cambios arquitectónicos). Faltaba una segunda regla
dura, implícita pero no escrita: el código entregado debe estar
**factorizado** (modular, con separación de responsabilidades), nunca
monolítico. Un primer intento del panel se entregó como un único archivo
de ~500 líneas, lo que motivó formalizar la regla.

## Decisión

Se incorpora una segunda **REGLA DE ORO** a El Crisol:

> Todo código entregado debe estar factorizado profesionalmente: módulos
> cohesivos, responsabilidad única, sin monolitos ni archivos "cajón de
> sastre". Un entregable monolítico es **FAIL automático** del Verificador
> y vuelve al Planificador (cuenta iteración).

Se versiona en `.claude/skills/el-crisol/SKILL.md` (sección Reglas duras y
checklist del Verificador) y se referencia en `CLAUDE.md`.

## Alternativas consideradas

- **Dejarla implícita**: descartada; lo implícito no se enforza ni viaja
  con el repo (mismo razonamiento que ADR 0018).
- **Métrica rígida (máx N líneas por archivo)**: descartada; arbitraria.
  Se prefiere el criterio de cohesión/responsabilidad única, evaluado por
  el Verificador.

## Consecuencias

- Positivas: entregables mantenibles y revisables; criterio explícito y
  auditable en el gate del Verificador.
- Negativas: más archivos y andamiaje en cambios chicos (aceptable; el
  fast-path del Crisol sigue cubriendo lo trivial).
