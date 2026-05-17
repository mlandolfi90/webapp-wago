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

Para el detalle de cada corrida y los pendientes abiertos: ver
[RUN-LEDGER.md](./RUN-LEDGER.md).
