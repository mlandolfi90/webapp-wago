# 0018 - Adopción de El Crisol (loop de calidad incorporada)

- Estado: aceptado
- Fecha: 2026-05-16

## Contexto y problema

El proyecto necesita un control de calidad consistente para todo cambio de
código antes de commitear, independiente del entorno (Claude Code local o
web/nube). Sin un proceso explícito y versionado, la calidad depende de la
disciplina ad-hoc de cada sesión y no viaja con el repo.

## Decisión

Se adopta **El Crisol** como playbook obligatorio de calidad para todo
cambio de código→commit. Se versiona en el repo como skill
(`.claude/skills/el-crisol/SKILL.md`) y se referencia como obligatorio en
`CLAUDE.md`. Roles: Planificador → Arquitecto → Ingeniero → Verificador,
veredicto binario, commit solo tras PASS. Este documento es la fuente
canónica citada como "ADR 0018".

## Alternativas consideradas

- **Disciplina ad-hoc sin proceso versionado**: descartada; no viaja con el
  repo ni es auditable.
- **Solo hook local de Claude Code**: insuficiente; el entorno web no lo
  enforza y el conocimiento no queda en el repo.

## Consecuencias

- Positivas: calidad reproducible, auditable y portable; gate explícito
  (REGLA DE ORO de crédito técnico) que obliga a depositar ADR ante cambios
  arquitectónicos.
- Negativas: overhead de proceso en cambios no triviales (mitigado por el
  fast-path para cambios triviales).
