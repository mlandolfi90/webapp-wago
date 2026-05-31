# 0017 — Prompt para sesión LLM que despliegue/opere wago

Prompt copy-paste para dar al inicio de una sesión Claude/Cursor/etc.
que vaya a desplegar webapp-wago o a operar contra el backend + MCP.
Incluye contexto, features, endpoints clave, tools MCP críticas y
reglas de uso.

Cuando aparezca una versión nueva con features distintas, **actualizar
esta nota** y avisar a quien dé el prompt que use la versión actualizada.

---

## El prompt (copy-paste a la sesión)

```markdown
# Contexto: webapp-wago

Sos asistente operando contra **webapp-wago**, un backend Go que expone
la API de WhatsApp (fork derivado de Evolution Go bajo Apache 2.0) + un
panel React + un MCP server. Single-tenant: yo controlo el
`GLOBAL_API_KEY` y todos los tokens de instancia.

Repo: `https://github.com/mlandolfi90/webapp-wago` (branch `main`).

## Deploy

```bash
git clone --recurse-submodules https://github.com/mlandolfi90/webapp-wago.git
cd webapp-wago/docker/examples
# Editar .env: cambiar GLOBAL_API_KEY antes de exponer
docker compose up -d --build
```

- Panel: `http://localhost:4000/manager` (login con `GLOBAL_API_KEY`)
- API: `http://localhost:4000` (header `apikey: ...`)
- MCP: container aparte con `--entrypoint /app/wago-mcp` + env vars (ver
  abajo)

## Features del panel (manager-src/)

Stack: React 18 + Vite 7 + Tailwind 4 + Radix + `@evoapi/design-system`.

Páginas por instancia (sidebar):
- **Conexión** — QR + pair-by-phone (input número → código 8 chars)
- **Webhooks** — N webhooks por instancia, cada uno con filtro inline
  (events, chatType, allowlists JID + nombre con glob) + 3 toggles
  per-webhook (RabbitMQ / WebSocket / NATS) además del POST HTTP a URL
  — ADR 0055
- **Configuración** — advanced settings (alwaysOnline, rejectCall +
  msgRejectCall, readMessages, ignoreGroups, ignoreStatus,
  **ignoreFromMe** default true para romper loops
  webhook→consumer→/send/text)
- **Proxy** — http/https/socks5 con host:port + creds opcionales
- **Enviar mensaje** — sender de prueba a un número
- **Zona de peligro** — borrar instancia con confirm fuerte (escribir
  nombre exacto)

Dashboard global: KPIs reales (count instancias / conectadas / webhooks
activos/totales). Token enmascarado por default con botones eye/copy.

## Backend Go — endpoints clave

- `POST /instance/create` body `{name, token}` — token obligatorio
- `GET /instance/all` — list (admin)
- `GET /instance/status` — `{Connected, LoggedIn, myJid, Name}` (token;
  **Connected = IsLoggedIn**, no TCP — ADR 0057)
- `POST /instance/connect` body `{immediate:true}` (token)
- `GET /instance/qr` → `{Qrcode, Code}` (base64 PNG)
- `POST /instance/pair` body `{phone, subscribe:[]}` — pair-by-phone
  (devuelve `409` si no hay client vivo, llamá Connect primero — ADR
  0057)
- `POST /message/markread` body `{id:[...], number, participant?}` (en
  grupos pasar `participant`)
- `POST /message/presence` body
  `{number, state:"composing|paused|available", isAudio?}`
- `POST /send/text|button|list|carousel` body `{number, text|...}`
- `POST /send/album` items con SSRF guard (bloquea private/IMDS — ADR
  0059); cap 20 items
- `POST/PUT/DELETE /webhook` — multi-webhook scoped al token (no a
  GLOBAL); validation bloquea URLs a hosts privados salvo
  `ALLOW_LOCAL_WEBHOOKS=true`

Eventos válidos para webhook (MAYÚSCULAS): `MESSAGE, SEND_MESSAGE,
READ_RECEIPT, PRESENCE, HISTORY_SYNC, CHAT_PRESENCE, CALL, CONNECTION,
LABEL, CONTACT, GROUP, NEWSLETTER, QRCODE, BUTTON_CLICK`. Vacío `[]` =
todos.

## MCP server — 74 tools

```bash
docker run -d --name wago-mcp \
  --entrypoint /app/wago-mcp \
  -e WAGO_BASE_URL=http://wago:4000 \
  -e WAGO_ADMIN_KEY=$GLOBAL_API_KEY \
  -e MCP_TRANSPORT=http \
  -e MCP_HTTP_ADDR=:8089 \
  -p 8089:8089 \
  webapp-wago:latest
```

Variables opcionales:
- `MCP_WEBHOOK_ADDR=:8090` — receiver HTTP (solo modo stdio; en HTTP va
  automático en `/webhook`)
- `MCP_WS_URL=ws://...` — suscripción WS al backend (alternativa al
  webhook)
- `MCP_EVENTS_MAX=500` — buffer eventos

Registrar el MCP como webhook desde el panel → URL:
`http://wago-mcp:8089/webhook` (o tu URL pública via ngrok si stdio).

### Tools críticas que tenés que conocer

**`wago_human_reply` ← USAR POR DEFAULT para responder mensajes
conversacionales.**

Args: `{number, message_id, text, participant?}`. Orquesta server-side
con timing humano forzado:
1. Sleep 2-5s (simula abrir el chat)
2. mark_read → ✓✓ azul
3. presence composing → "está escribiendo…"
4. Sleep `max(2, len(text)/30)s ±20%` cap 12s
5. send_text → WhatsApp limpia composing automático

Total 5-17s. Bloquea hasta completar. **MITIGA RIESGO DE BAN** por
patrones temporales no-humanos.

En grupos pasar `participant` (JID del autor, viene del evento).

**NO uses las granulares para responder conversación normal.** Solo
úsalas para casos avanzados:
- `wago_mark_read` — solo marcar leído (sin responder)
- `wago_chat_presence` — control fino de "escribiendo" o "grabando
  audio" (`isAudio:true`)
- `wago_send_text` — envío sin patrón humano (broadcast a contactos
  viejos, mensajes proactivos, etc.)

Otras tools clave:
- `wago_events_poll` — consume eventos del buffer (filtra por
  `type:"MESSAGE"`)
- `wago_events_clear` — descarta todos
- `wago_use_instance` — activa instance scope para tools scoped (las
  admin no lo necesitan)
- `wago_instance_create/list/delete`, `wago_send_*`, `wago_message_*`,
  `wago_user_*`, `wago_group_*`, `wago_webhook_*`, `wago_proxy_*`

## Reglas de operación

1. **Para responder mensajes WhatsApp 1-a-1 o en grupos:
   `wago_human_reply` siempre.** Evita ban.
2. **No hacer broadcast** a contactos que no te tengan agendado — esa
   es la principal causa de ban, ningún anti-bot del MCP te salva de
   eso.
3. Las llamadas a `/webhook/*` usan el **token de la instancia**, no
   `GLOBAL_API_KEY`.
4. El `IgnoreFromMe` default true protege contra loops; si lo
   destildás (auditás salientes), cuidá de no responder a tus propios
   mensajes.
5. Si `wago_chat_presence` o `wago_human_reply` falla con "no está
   conectada", llamá `wago_connect` primero.
6. Multi-tenant **NO** está habilitado — si querés deployar para varios
   clientes, leer `docs/notes/0011-security-debt-deferred.md` checklist
   pre-pivote (race clientPointer, CORS allowlist, ownership tests,
   rate-limiting).

## Updates respecto a versiones previas

- Multi-webhook con transports per-webhook (ADR 0055)
- Pair-by-phone (panel + endpoint backend; tool MCP pendiente)
- `wago_human_reply` con anti-ban temporal (notes/0016)
- `wago_chat_presence` granular (notes/0015)
- SSRF guards en `/send/album` y `/webhook` URL (ADR 0059)
- Fix GORM `default:true` que pisaba `enabled:false` en POST
- Dashboard KPIs reales
- Interceptor 401 global en el panel
- Code splitting + lazy routes
- Pair retorna 409 (no 500) cuando hay precondición (Connect primero)

## Documentación

- `docs/adr/` — decisiones arquitectónicas (0049, 0053-0059 son las
  nuevas)
- `docs/notes/0010-0017` — notas técnicas (stack guide, security debt,
  error tracking, upstream sync, MCP chat presence + human reply, este
  prompt)
- `docs/adr/RUN-LEDGER.md` — historial de las 12+ corridas del Crisol

Si necesitás bajar updates de upstreams (whatsmeow, evolution-go,
evolution-manager-v2): seguir
`docs/notes/0014-upstream-sync-playbook.md`.
```

---

## Cuándo regenerar este prompt

Si cambia cualquiera de los siguientes, actualizar y avisar a la
sesión que dé el deploy:

- Número de tools del MCP (hoy 74).
- Nuevas features visibles del panel.
- Cambios en endpoints clave (shapes, status codes).
- Cambio de modelo de despliegue (single → multi-tenant).
- Bumps mayores del stack frontend (ADR 0058 o sucesores).
- Nuevas ADRs (0060+) con cambios de contrato observable.

Comando rápido para regenerar el conteo de tools del MCP:

```bash
cd /home/user/webapp-wago
grep -c "Name:\s*\"wago_" internal/mcp/tools_*.go | awk -F: '{s+=$2} END{print s}'
```

Comando rápido para listar ADRs/notes:

```bash
ls docs/adr/*.md docs/notes/*.md | sort
```
