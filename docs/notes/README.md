# docs/notes — Notas técnicas

Notas operativas / técnicas que NO son ADRs (no son decisiones
arquitectónicas que disparen el Crisol). Documentan:
guías de uso, debt aceptada, procedimientos, prompts, etc.

Para decisiones técnicas (ADRs): ver [`../adr/`](../adr/README.md).
Para corridas del Crisol: ver [`../adr/RUN-LEDGER.md`](../adr/RUN-LEDGER.md).

## Índice

| Nota | Título | Para qué la leés |
|---|---|---|
| [0010](./0010-manager-react-stack.md) | Manager React stack guide | Cómo trabajar con `manager-src/`: dev loop, build, theming, i18n, agregar páginas |
| [0011](./0011-security-debt-deferred.md) | Security debt deferred + checklist multi-tenant | Hallazgos del code-review que se postergaron + 7 ítems que **deben** cerrarse antes de aceptar multi-tenant |
| [0012](./0012-error-tracking-deferred.md) | Error tracking deferred (GlitchTip > Sentry) | Decisión sobre por qué no hay Sentry y plan para cuando se priorice |
| [0013](./0013-messages-today-deferred.md) | KPI "Mensajes hoy" descartado | Por qué el KPI muestra "—" y plan futuro si se prioriza |
| [0014](./0014-upstream-sync-playbook.md) | **Playbook upstream sync** | Cómo bajar updates de `tulir/whatsmeow`, `EvolutionAPI/whatsmeow`, `EvolutionAPI/evolution-go`, `EvolutionAPI/evolution-manager-v2`. Lista INCLUIR/EXCLUIR + cmds copy-paste. |
| [0015](./0015-mcp-chat-presence-flow.md) | MCP chat presence flow | Patrón humano (mark_read → composing → send) y cómo lo seguís con las tools granulares |
| [0016](./0016-mcp-human-reply-anti-ban.md) | MCP `wago_human_reply` anti-ban | Tool wrapper que orquesta server-side con sleeps humanos forzados. USAR POR DEFAULT para responder mensajes |
| [0017](./0017-deploy-prompt.md) | **Prompt para sesión LLM que despliegue/opere wago** | Copy-paste al inicio de una sesión nueva — features, endpoints, tools, reglas de operación |

## Cuándo crear una nota nueva (vs ADR)

| Tipo | Va a `notes/` | Va a `adr/` |
|---|---|---|
| Decisión arquitectónica con consecuencias para el código | | ✅ ADR |
| Procedimiento operativo (cómo hacer X) | ✅ Nota | |
| Debt aceptada que se documenta para futuro | ✅ Nota | |
| Trade-off de decisión NO arquitectónica | ✅ Nota | |
| Decisión que cambia un contrato observable | | ✅ ADR |
| Guía / how-to / prompt | ✅ Nota | |

Si una nota crece a "decisión con consecuencias arquitectónicas", promovela
a ADR y dejá un stub en la nota apuntando al ADR.
