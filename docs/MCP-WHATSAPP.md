# WebAPP-Wago como MCP de WhatsApp

Guía para envolver esta API REST como un **servidor MCP** (Model Context
Protocol) que un asistente (Claude, etc.) pueda usar como herramienta de
WhatsApp. Referencia de endpoints: `docs/MANUAL.md`.

> Este documento es de **diseño/integración**. No incluye una
> implementación productiva: define la estrategia, el mapeo
> endpoint→tool, el manejo de credenciales y un esqueleto mínimo.

---

## 1. Estrategia

El servidor MCP es un **adaptador fino** delante de la API REST:

```
Asistente (Claude) ──MCP──▶ Servidor MCP ──HTTP(apikey)──▶ WebAPP-Wago ──▶ WhatsApp
```

- No reimplementa lógica de WhatsApp: traduce *tool calls* a llamadas HTTP.
- Cada tool MCP ≈ un endpoint (o un grupo cohesivo de endpoints).
- El servidor MCP guarda la config (`baseUrl`, `GLOBAL_API_KEY`, y el
  `token` de la instancia activa) y la inyecta en el header `apikey`.
- Transporte MCP recomendado: **stdio** (local) o HTTP/SSE (remoto).

## 2. Manejo de credenciales y de "instancia activa"

Dos ámbitos de auth (ver MANUAL §3). El MCP debe resolver, por cada tool,
qué `apikey` mandar:

| Categoría de tool | `apikey` |
|---|---|
| `instance_create`, `instance_list`, `instance_delete`, `instance_proxy*`, `instance_logs`, `instance_info` | `GLOBAL_API_KEY` (admin) |
| Todo lo demás (mensajería, grupos, usuarios, …) | `token` de la **instancia activa** |

Patrón recomendado:

1. Config del servidor MCP por env: `WAGO_BASE_URL`, `WAGO_ADMIN_KEY`.
2. Tool `wago_use_instance(token)` que fija la **instancia activa** en
   memoria del proceso MCP; el resto de tools de ámbito-instancia la usan.
3. Nunca exponer las claves al modelo: viven en el servidor MCP, no en
   los argumentos de las tools (salvo `wago_use_instance`, que recibe el
   token explícitamente al iniciar sesión).

## 3. Catálogo de tools sugerido

Nombres `wago_*`, agrupados. Cada tool mapea 1:1 a un endpoint del MANUAL.
Prioridad de exposición: **núcleo primero**, evitar los *not working*.

### Núcleo (exponer primero)

| Tool | Endpoint | Args principales |
|---|---|---|
| `wago_instance_create` | `POST /instance/create` | `name`, `token`, `proxy?` |
| `wago_instance_list` | `GET /instance/all` | — |
| `wago_use_instance` | (estado local) | `token` |
| `wago_connect` | `POST /instance/connect` | `webhookUrl?`, `subscribe?` |
| `wago_get_qr` | `GET /instance/qr` | — |
| `wago_pair_code` | `POST /instance/pair` | `phone` |
| `wago_status` | `GET /instance/status` | — |
| `wago_send_text` | `POST /send/text` | `number`, `text` |
| `wago_send_media` | `POST /send/media` | `number`, `type`, `url`, `caption?` |
| `wago_send_location` | `POST /send/location` | `number`, `latitude`, `longitude` |
| `wago_react` | `POST /message/react` | `number`, `id`, `reaction` |
| `wago_mark_read` | `POST /message/markread` | `number`, `id[]` |
| `wago_check_user` | `POST /user/check` | `number[]` |

### Extendido (segunda iteración)

`wago_send_link` · `wago_send_poll` · `wago_send_button` ·
`wago_send_list` · `wago_send_contact` · `wago_send_sticker` ·
`wago_send_carousel` · `wago_message_edit` · `wago_message_delete` ·
`wago_message_status` · `wago_download_media` · `wago_presence` ·
`wago_user_info` · `wago_user_avatar` · `wago_contacts` ·
`wago_block` / `wago_unblock` · `wago_group_list` · `wago_group_info` ·
`wago_group_create` · `wago_group_participant` · `wago_group_invite` ·
`wago_newsletter_*` · `wago_poll_results` · `wago_label_*` ·
`wago_instance_disconnect` / `wago_instance_logout` /
`wago_instance_delete` / `wago_instance_proxy_set|delete`.

### No exponer (marcados *not working*)

`/chat/{pin,unpin,archive,unarchive,mute,unmute}` y `/group/myall`.

## 4. Mapeo de input schema

Los `inputSchema` de cada tool se derivan directamente de los structs de
request del MANUAL §7 (campos `*` = `required`). Reglas:

- `number`: string, teléfono internacional **sin `+`** o JID.
- Omitir del schema MCP los campos de transporte avanzados
  (`formatJid`, `delay`, `quoted`) salvo que el caso de uso los pida.
- Validar `number` antes de llamar; el backend además valida vía
  middleware (`ValidateNumberField...`).
- Respuestas: propagar `data` al modelo; ante `{"error":...}` devolver el
  error como contenido de la tool (no romper la sesión MCP).

## 5. Eventos entrantes (mensajes hacia el asistente)

MCP es *pull* (el modelo invoca tools); WhatsApp es *push*. Para que el
asistente reaccione a mensajes entrantes hay dos opciones:

1. **Webhook → cola → tool de polling.** El servidor MCP levanta un
   endpoint HTTP, lo registra como `webhookUrl` en `wago_connect`, encola
   los eventos `MESSAGE`, y expone `wago_poll_events()` /
   `wago_wait_for_message()` como tool.
2. **WebSocket.** El servidor MCP se conecta a `GET /ws?instanceId=…`
   (`websocketEnable:"true"`), bufferiza y expone la misma tool de polling.

Suscribir mínimamente `["MESSAGE","CONNECTION","SEND_MESSAGE"]` (MANUAL §8).

## 6. Esqueleto mínimo (TypeScript, SDK MCP)

Ilustrativo — no productivo (faltan validación, reintentos, manejo de
media, cola de eventos):

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const BASE = process.env.WAGO_BASE_URL!;       // http://host:8080
const ADMIN = process.env.WAGO_ADMIN_KEY!;     // GLOBAL_API_KEY
let activeToken = "";                          // instancia activa

async function call(path: string, opts: {
  method?: string; admin?: boolean; body?: unknown;
} = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method ?? "GET",
    headers: {
      apikey: opts.admin ? ADMIN : activeToken,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const server = new McpServer({ name: "wago-whatsapp", version: "1.0.0" });

server.tool("wago_use_instance",
  { token: z.string() },
  async ({ token }) => {
    activeToken = token;
    return { content: [{ type: "text", text: "instancia activa fijada" }] };
  });

server.tool("wago_send_text",
  { number: z.string(), text: z.string() },
  async ({ number, text }) => {
    const r = await call("/send/text", { method: "POST", body: { number, text } });
    return { content: [{ type: "text", text: JSON.stringify(r.data ?? r) }] };
  });

server.tool("wago_status", {}, async () => {
  const r = await call("/instance/status");
  return { content: [{ type: "text", text: JSON.stringify(r.data ?? r) }] };
});

// ... registrar el resto según el catálogo §3
```

## 7. Checklist de implementación

- [ ] Config por env (`WAGO_BASE_URL`, `WAGO_ADMIN_KEY`); claves fuera del modelo.
- [ ] Tools del **núcleo** (§3) con `inputSchema` desde MANUAL §7.
- [ ] Cliente HTTP con timeout + reintentos + propagación de `{"error"}`.
- [ ] `wago_use_instance` y selección de `apikey` por ámbito.
- [ ] Recepción de eventos (webhook o WS) + tool de polling.
- [ ] No registrar los endpoints *not working*.
- [ ] Tools extendidas en una segunda fase.

> Si se implementa el servidor MCP **dentro de este repo**, es código y
> dispara El Crisol (ADR 0018): tier completo. Este documento es sólo la
> guía de diseño.
