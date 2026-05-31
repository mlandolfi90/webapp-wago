# ADR — Architecture Decision Records

Decisiones técnicas registradas (gate de crédito técnico de El Crisol,
Regla de Oro #1). Numeración sin huecos; cada ADR documenta contexto,
decisión, alternativas y consecuencias.

> **RUN-LEDGER.md** (en esta carpeta) **no es un ADR**: es la memoria de
> proceso de El Crisol (corridas, veredictos, pendientes). Vive acá por
> convención del Crisol (ADR 0018). No mover, no renumerar.

## Índice

| ADR | Título |
|----|--------|
| 0018 | Adopción de El Crisol (loop de calidad) |
| 0050 | Restaurar look "WebAPP-Wago" (shell sidebar + topbar + footer) |
| 0051 | Tema claro con toggle + topbar completo (API Tester, iconos) |
| 0052 | Card de instancia minimal + página detalle inline (paridad bundle) |
| 0019 | Rebuild del panel: vanilla, sin build |
| 0020 | Regla de Oro: código factorizado |
| 0021 | Identidad visual del panel (Evolution) |
| 0022 | Patrón de ayuda contextual en campos |
| 0023 | Compositor multi-tipo de envío |
| 0024 | Sender multi-paso con progreso (envío secuencial) |
| 0025 | Patrón de modal de gestión de dominio |
| 0026 | Patrón de identidad copiable (nombre + LID/JID) |
| 0027 | Dominio Usuarios/Contactos |
| 0028 | Helper compartido tabbedForms + dominio Mensajes |
| 0029 | Dominios menores: Comunidades/Etiquetas/Newsletters/Utils |
| 0030 | tabbedForms con tabs custom; deuda saldada |
| 0031 | Layout de la tarjeta de instancia (acciones agrupadas) |
| 0032 | Servidor MCP en Go (stdlib-only) |
| 0033 | Catálogo MCP completo, factorizado por dominio |
| 0034 | Recepción de eventos en el MCP (webhook + buffer) |
| 0035 | Binario MCP integrado a la imagen Docker |
| 0036 | Estrategia de upstreaming |
| 0037 | Fix: read receipts (checks azules) en grupos |
| 0038 | Envío de álbum (backend) |
| 0039 | Álbum propagado a MCP y webui |
| 0040 | Pipeline de CI |
| 0041 | Recepción de eventos por WebSocket en el MCP |
| 0042 | Submódulo whatsmeow repuntado al fork propio |
| 0043 | Organización del repo: limpieza, índices y vetos del Steward |
| 0044 | Fix: contrato profileName/profileStatus (MCP + webui) |
| 0045 | Webhooks múltiples por instancia con filtros inline |
| 0046 | Webhook filter: wildcards en JID + selector por nombre en UI |
| 0047 | Webhook allowlist: display `Nombre <JID>` (RFC 5322) |
| 0048 | Webhook filter por NOMBRE de grupo/contacto (opción C) |
| 0049 | Webhook: skip de mensajes propios (`IgnoreFromMe`) para romper loops |
| 0053 | **Revertir** ADR 0019: panel vuelve a React+Vite+Radix (rebase a Evolution Manager v2) |
| 0054 | Stack del panel React + estructura de carpetas |
| 0055 | Webhook transports per-webhook (RabbitMQ / WebSocket / NATS toggles individuales) |
| 0057 | Fix Status + Pair: `Connected=IsLoggedIn`, Pair nil-safe + propaga errores |
| 0058 | Bump deps frontend (Vite 5→7, Tailwind 3→4, TS 5.6→5.2) — retroactivo |
| 0059 | SSRF guards en `/send/album::downloadMedia` + `/webhook` URL validation |

> ADRs **0050-0052 reemplazadas** por 0053 (rebase a Evolution Manager v2).
> ADR **0019 marcada REEMPLAZADA**.

Para el detalle de cada corrida y los pendientes abiertos: ver
[RUN-LEDGER.md](./RUN-LEDGER.md).
