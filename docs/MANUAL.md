# Manual de WebAPP-Wago — API de WhatsApp

> Manual operativo y de referencia de **toda** la utilidad de la API.
> Fuente de verdad: `pkg/routes/routes.go` + `docs/swagger.json` del backend
> Go (no la tabla del README, que está desactualizada). Para armar un **MCP
> de WhatsApp** sobre este proyecto, ver además `docs/MCP-WHATSAPP.md`.

---

## 1. Qué es

Servicio REST en Go que habla el protocolo de WhatsApp vía `whatsmeow`
(sin Puppeteer ni emulador). Una sola instancia del servicio administra
**múltiples instancias de WhatsApp** (cada una = un número/sesión).
Capacidades: emparejar (QR / código), enviar mensajes de todo tipo,
gestionar usuarios/contactos, grupos, comunidades, canales (newsletters),
etiquetas, encuestas, llamadas, y recibir eventos en tiempo real
(Webhook / WebSocket / RabbitMQ / NATS).

## 2. Cómo levantarlo

Ver `CLAUDE.md` y `README.md`. Resumen:

```bash
git clone --recurse-submodules https://github.com/mlandolfi90/webapp-wago.git
cd webapp-wago/docker/examples
docker compose up -d --build
```

- Panel web: `http://localhost:4000/manager`
- Swagger UI: `http://<host>:<port>/swagger/index.html`
- Healthcheck: `GET /server/ok`

### Configuración (variables de entorno)

| Variable | Descripción | Default |
|---|---|---|
| `SERVER_PORT` | Puerto HTTP | `8080` |
| `GLOBAL_API_KEY` | Clave de administración (¡cambiar antes de exponer!) | **Requerida** |
| `CLIENT_NAME` | Identificador de cliente | `webapp-wago` |
| `DATABASE_SAVE_MESSAGES` | Persistir historial de mensajes | `false` |
| `POSTGRES_AUTH_DB` / `POSTGRES_USERS_DB` | Cadenas de conexión PostgreSQL | — |
| `WEBHOOK_URL` | Webhook global (opcional) | — |
| `AMQP_URL` | RabbitMQ (opcional) | — |
| `NATS_URL` | NATS (opcional) | — |
| `MINIO_*` | Almacenamiento de media S3/MinIO (opcional) | — |
| `WADEBUG` / `DEBUG_ENABLED` | Nivel de log | `INFO` |

## 3. Autenticación

Todas las rutas protegidas usan el header **`apikey`** (no `Authorization`).
Hay **dos ámbitos**:

| Ámbito | Header `apikey` = | Rutas |
|---|---|---|
| **Admin** | `GLOBAL_API_KEY` | `POST /instance/create`, `GET /instance/all`, `GET /instance/info/:id`, `DELETE /instance/delete/:id`, `POST·DELETE /instance/proxy/:id`, `POST /instance/forcereconnect/:id`, `GET /instance/logs/:id` |
| **Instancia** | token de la instancia | **todo el resto** (`/instance/connect|status|qr|pair|...`, `/send/*`, `/message/*`, `/user/*`, `/group/*`, `/chat/*`, `/community/*`, `/label/*`, `/unlabel/*`, `/newsletter/*`, `/call/*`, `/polls/*`) |

El token de instancia se define al crearla (`token` en `/instance/create`).
Rutas sin auth: `/manager`, `/assets`, `/swagger`, `/server/ok`,
`/license/*` (no-op, siempre `active`).

CORS está abierto (`Access-Control-Allow-Origin: *`).

## 4. Envelope de respuesta

Respuestas JSON. Éxito típico:

```json
{ "message": "...", "data": { ... } }
```

Error:

```json
{ "error": "descripción del error" }
```

Códigos: `200` ok · `400` validación / body inválido · `401` falta
`apikey` · `403` `apikey` inválida · `500` error interno.

## 5. Identificación de destinatarios (number / JID)

Casi todos los endpoints de mensajería reciben `number`:

- Teléfono en formato internacional **sin `+`**: `5491122334455`.
- O un JID completo: usuario `5491122334455@s.whatsapp.net`,
  grupo `1203...@g.us`, canal `...@newsletter`.
- `formatJid: true` fuerza el formateo a JID desde un número crudo.
- Campos de menciones: `mentionedJid: []`, o `mentionAll: true`.
- `quoted`: objeto para responder citando otro mensaje.
- `delay`: milisegundos de espera antes de enviar (simular tipeo).

## 6. Ciclo de vida de una instancia

```
create  ──▶  connect  ──▶  qr | pair  ──▶  status (Connected/LoggedIn)
   │                                            │
   │                                            ▼
   └────────────── send/* · user/* · group/* · ... 
                                                │
            disconnect ◀── reconnect ── logout ─┘ ── delete
```

1. `POST /instance/create` (admin) — define `name`, `token`,
   opcional `proxy`, `advancedSettings`.
2. `POST /instance/connect` (token) — inicia la conexión; define
   `webhookUrl`, `subscribe[]`, `websocketEnable`, etc.
3. `GET /instance/qr` (token) — devuelve `Qrcode` (data URI) y `Code`.
   Alternativa: `POST /instance/pair` con `phone` → código de 8 dígitos.
4. `GET /instance/status` (token) — `Connected`, `LoggedIn`, `Name`.
5. Operar (`/send/*`, etc.).
6. `POST /instance/disconnect` · `POST /instance/reconnect` ·
   `DELETE /instance/logout` · `DELETE /instance/delete/:id` (admin).

---

## 7. Catálogo completo de endpoints

Leyenda: **A** = ámbito Admin (`GLOBAL_API_KEY`), **I** = ámbito
Instancia (token). Campos con `*` = requeridos por el contrato; el resto
opcionales. Tipos: `[]x` = array de x.

### 7.1 Instance — gestión de instancias

| Mét. | Ruta | Sc. | Body (campos) | Notas |
|---|---|---|---|---|
| POST | `/instance/create` | A | `name`, `token`, `instanceId`, `proxy{host,port,username,password}`, `advancedSettings` | `name` y `token` obligatorios (validado en handler) |
| GET | `/instance/all` | A | — | lista todas las instancias |
| GET | `/instance/info/:instanceId` | A | — | datos de una instancia |
| DELETE | `/instance/delete/:instanceId` | A | — | borra definitivamente |
| POST | `/instance/proxy/:instanceId` | A | `host*`, `port*`, `username`, `password` | configurar proxy |
| DELETE | `/instance/proxy/:instanceId` | A | — | quitar proxy |
| POST | `/instance/forcereconnect/:instanceId` | A | `number` | reconexión forzada |
| GET | `/instance/logs/:instanceId` | A | — | logs de la instancia |
| POST | `/instance/connect` | I | `webhookUrl`, `subscribe[]`, `websocketEnable`, `natsEnable`, `rabbitmqEnable`, `immediate`, `phone` | inicia sesión WhatsApp |
| GET | `/instance/status` | I | — | `Connected`/`LoggedIn`/`Name` |
| GET | `/instance/qr` | I | — | `Qrcode` (img) + `Code` |
| POST | `/instance/pair` | I | `phone`, `subscribe[]` | emparejar por código |
| POST | `/instance/disconnect` | I | — | desconectar (mantiene sesión) |
| POST | `/instance/reconnect` | I | — | reconectar |
| DELETE | `/instance/logout` | I | — | cerrar sesión (desvincula) |
| GET | `/instance/:instanceId/advanced-settings` | I | — | leer ajustes avanzados |
| PUT | `/instance/:instanceId/advanced-settings` | I | `alwaysOnline`, `ignoreGroups`, `ignoreStatus`, `readMessages`, `rejectCall`, `msgRejectCall` | actualizar ajustes |

### 7.2 Send Message — envío de mensajes

Todos **I**, `POST /send/...`. Campo común: `number*` (destinatario) +
opcionales `delay`, `formatJid`, `mentionAll`, `mentionedJid[]`, `quoted`,
`id` (id de mensaje propio).

| Ruta | Body específico |
|---|---|
| `/send/text` | `text*` |
| `/send/link` | `url*`, `text`, `title`, `description`, `imgUrl` |
| `/send/media` | `url*`, `type*` (image/video/audio/document), `caption`, `filename` |
| `/send/album` | `items[]*` (`{type:image\|video, url}`, mín. 2), `caption` (va en el primero) — álbum agrupado (ADR 0038) |
| `/send/sticker` | `sticker*` (url o base64) |
| `/send/location` | `latitude*`, `longitude*`, `name`, `address` |
| `/send/contact` | `vcard{…}` |
| `/send/poll` | `question*`, `options[]*`, `maxAnswer` |
| `/send/button` | `title`, `description`, `footer`, `buttons[]` |
| `/send/list` | `title`, `description`, `buttonText`, `footerText`, `sections[]` |
| `/send/carousel` | `body`, `footer`, `cards[]` |
| `/send/status/text` | mensaje de estado (texto) |
| `/send/status/media` | mensaje de estado (media) |

### 7.3 Message — operaciones sobre mensajes

Todos **I**, `POST /message/...`.

| Ruta | Body | Notas |
|---|---|---|
| `/message/react` | `number*`, `id*`, `reaction`, `fromMe`, `participant` | reaccionar (emoji) |
| `/message/presence` | `number*`, `state`, `isAudio` | indicador "escribiendo/grabando" |
| `/message/markread` | `number*`, `id[]*`, `participant` | marcar leído. **En grupos `participant` (JID del autor) es obligatorio** o el check azul no registra (ADR 0037) |
| `/message/downloadmedia` | `message{…}` | descargar media de un mensaje |
| `/message/status` | `id*` | estado de entrega/lectura |
| `/message/delete` | `number*`, `messageId*`, `chat` | borrar para todos |
| `/message/edit` | `chat*`, `messageId*`, `message*` | editar (solo texto) |

### 7.4 User — usuarios / contactos / perfil

Todos **I**.

| Mét. | Ruta | Body |
|---|---|---|
| POST | `/user/info` | `number[]*`, `formatJid` |
| POST | `/user/check` | `number[]*` (¿está en WhatsApp?) |
| POST | `/user/avatar` | `number*`, `preview` |
| GET | `/user/contacts` | — |
| GET | `/user/privacy` | — |
| POST | `/user/privacy` | `lastSeen`, `online`, `profile`, `status`, `readReceipts`, `groupAdd`, `callAdd` |
| POST | `/user/block` | `number*` |
| POST | `/user/unblock` | `number*` |
| GET | `/user/blocklist` | — |
| POST | `/user/profilePicture` | `image*` |
| POST | `/user/profileName` | `image` → (nombre) |
| POST | `/user/profileStatus` | `image` → (estado) |

### 7.5 Group — grupos

Todos **I**.

| Mét. | Ruta | Body |
|---|---|---|
| GET | `/group/list` | — |
| POST | `/group/info` | `groupJid*` |
| POST | `/group/invitelink` | `groupJid*`, `reset` |
| POST | `/group/create` | `groupName*`, `participants[]*` |
| POST | `/group/participant` | `groupJid*`, `participants[]*`, `action` (add/remove/promote/demote) |
| POST | `/group/name` | `groupJid*`, `name*` |
| POST | `/group/description` | `groupJid*`, `description` |
| POST | `/group/photo` | `groupJid*`, `image*` |
| POST | `/group/join` | `code*` (link de invitación) |
| POST | `/group/leave` | `groupJid*` |
| GET | `/group/myall` | — | ⚠️ marcado *not working* en el código |

### 7.6 Chat — estado de conversaciones

Todos **I**, `POST /chat/...`. ⚠️ `pin/unpin/archive/unarchive/mute/unmute`
están marcados **`// TODO: not working`** en `routes.go`: documentados pero
no fiables. `history-sync-request` sí opera.

| Ruta | Body |
|---|---|
| `/chat/pin` `/chat/unpin` | `chat*` |
| `/chat/archive` `/chat/unarchive` | `chat*` |
| `/chat/mute` `/chat/unmute` | `chat*` |
| `/chat/history-sync` | `count`, `messageInfo` |

### 7.7 Community — comunidades

Todos **I**. `POST /community/create` (`communityName*`),
`POST /community/add` y `/community/remove`
(`communityJid*`, `groupJid[]*`).

### 7.8 Label / Unlabel — etiquetas

Todos **I**. `GET /label` (listar), `POST /label/chat`
(`jid*`,`labelId*`), `POST /label/message`
(`jid*`,`labelId*`,`messageId*`), `POST /label/edit`
(`labelId*`,`name`,`color`,`deleted`). `POST /unlabel/chat` y
`/unlabel/message` quitan etiquetas.

### 7.9 Newsletter — canales

Todos **I**. `POST /newsletter/create` (`name*`,`description`),
`GET /newsletter/list`, `POST /newsletter/info` (`jid*`),
`POST /newsletter/link` (`key*`), `POST /newsletter/subscribe` (`jid*`),
`POST /newsletter/messages` (`jid*`,`count`,`before_id`).

### 7.10 Polls — encuestas

**I**. `GET /polls/:pollMessageId/results` — resultados de una encuesta
enviada con `/send/poll`.

### 7.11 Call — llamadas

**I**. `POST /call/reject` (`callId*`, `callCreator`) — rechazar llamada
entrante.

### 7.12 Utilitarios (sin auth)

| Ruta | Uso |
|---|---|
| `GET /server/ok` | healthcheck |
| `GET /swagger/index.html` | documentación OpenAPI interactiva |
| `GET /manager` | panel web (UI) |
| `GET /license/status\|register` · `POST /license/activate` | no-op, siempre `{"status":"active"}` |

---

## 8. Eventos en tiempo real

Al conectar (`/instance/connect`) se configura cómo recibir eventos:

- **Webhook**: `webhookUrl` por instancia (o `WEBHOOK_URL` global). Se hace
  `POST` con el evento en JSON.
- **WebSocket**: `websocketEnable: "true"` y conectarse a
  `GET /ws?instanceId=<id>` (o el id que corresponda).
- **RabbitMQ**: `rabbitmqEnable` + `AMQP_URL`.
- **NATS**: `natsEnable` + `NATS_URL`.

`subscribe[]` filtra qué tipos llegan. Valores soportados:

```
MESSAGE · SEND_MESSAGE · READ_RECEIPT · PRESENCE · HISTORY_SYNC
CHAT_PRESENCE · CALL · CONNECTION · LABEL · CONTACT · GROUP
NEWSLETTER · QRCODE · BUTTON_CLICK
```

Eventos clave para integraciones:

- `QRCODE` / `CONNECTION` — estado de emparejamiento y sesión.
- `MESSAGE` — mensajes entrantes (núcleo de un bot).
- `SEND_MESSAGE` — confirmación de salientes.
- `READ_RECEIPT` — acuses de lectura.
- `BUTTON_CLICK` — interacción con botones/listas.

---

## 9. Ejemplos (curl)

```bash
HOST=http://localhost:8080
ADMIN=tu-GLOBAL_API_KEY
TOKEN=token-de-la-instancia

# Crear instancia (admin)
curl -s -X POST $HOST/instance/create -H "apikey: $ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"ventas","token":"'"$TOKEN"'"}'

# Conectar y suscribir eventos (token)
curl -s -X POST $HOST/instance/connect -H "apikey: $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"webhookUrl":"https://mi-app/hook","subscribe":["MESSAGE","CONNECTION"]}'

# Traer el QR
curl -s $HOST/instance/qr -H "apikey: $TOKEN"

# Estado
curl -s $HOST/instance/status -H "apikey: $TOKEN"

# Enviar texto
curl -s -X POST $HOST/send/text -H "apikey: $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"number":"5491122334455","text":"Hola desde Wago"}'

# Enviar imagen
curl -s -X POST $HOST/send/media -H "apikey: $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"number":"5491122334455","type":"image","url":"https://.../f.jpg","caption":"foto"}'
```

---

## 10. Notas y limitaciones

- La tabla "Key endpoints" del `README.md` está **desactualizada**
  (usa rutas tipo `/message/sendText`); las rutas reales son las de este
  manual / `routes.go` / Swagger.
- Endpoints marcados *not working* en el código (no usar para producción):
  `/chat/{pin,unpin,archive,unarchive,mute,unmute}`, `/group/myall`.
- `/send/contact` sólo envía **un** contacto (TODO multi-contacto).
- `/message/edit` edita sólo texto (no media).
- Para detalle de schemas completos (todas las propiedades anidadas):
  Swagger UI o `docs/swagger.json` (441 definiciones).
