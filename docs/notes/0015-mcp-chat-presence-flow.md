# 0015 — MCP chat presence: flujo humano para LLM bots

Nota técnica que documenta el **patrón humano de respuesta** que debe
seguir un LLM (Claude, Cursor, etc.) cuando responde mensajes de
WhatsApp a través del MCP server de wago, para que el receptor del
mensaje vea un comportamiento indistinguible de un humano.

## Contexto

WhatsApp tiene 3 señales visibles que un humano emite naturalmente al
responder un mensaje:

1. **Lee el mensaje** → checks azules `✓✓` (read receipt).
2. **Empieza a escribir** → indicador "está escribiendo…" (chat
   presence).
3. **Envía la respuesta** → desaparece el indicador, llega el mensaje.

Un bot que solo hace (3) se nota inmediatamente como bot: el ✓✓ queda
gris para siempre, y el mensaje aparece "de la nada" sin indicador
previo. UX degradada y vector de detección anti-bot.

El MCP de wago expone las 3 tools necesarias para emular el patrón
humano: `wago_mark_read`, `wago_chat_presence`, `wago_send_text`.

## Decisión

Documentar el **patrón humano** en la descripción del tool
`wago_chat_presence` (`internal/mcp/tools_message.go`) para que el LLM
lo lea cada vez que use la tool y lo aplique consistente.

Descripción concreta del tool (verbatim, debe matchear el código):

> "Muestra 'está escribiendo…' (o 'grabando audio…') al receptor.
> PATRÓN HUMANO recomendado para responder mensajes:
> (1) `wago_mark_read` PRIMERO (✓✓ azul, lo que haría un humano al
>     abrir el chat);
> (2) `wago_chat_presence` con `state='composing'` (muestra que estás
>     pensando/escribiendo);
> (3) procesar/pensar la respuesta;
> (4) `wago_send_text` (al enviar, WhatsApp limpia el 'escribiendo'
>     automático).
> Si tu proceso tarda >15s, RE-LLAMÁ `wago_chat_presence` `composing`
> cada 10s — el indicador se cae por timeout. Si el `send_text` falla,
> llamá explícito `state='paused'` para limpiar.
> Args: `number` (JID del chat), `state` (composing|paused|available),
> `isAudio` (true muestra 'grabando audio…' en vez de 'escribiendo…')."

## Comportamiento real del indicador

Cuando el bot envía `composing`, WhatsApp lo muestra hasta que pase
**lo primero** de estos 3:

| Trigger | Cómo se limpia |
|---|---|
| Mensaje propio del sender llega al receptor | Automático (caso 99%) |
| Timeout sin renovar | ~15-25s |
| `state: "paused"` explícito | Inmediato |

### Casos en que queda colgado

- ❌ `composing` enviado pero `send_text` falla (red, validación, etc.)
  → indicador colgado hasta el timeout.
- ❌ LLM piensa más de 25s sin renovar el `composing` → parpadea.
- ❌ Cliente WhatsApp del receptor muy viejo → puede no limpiar bien.

### Patrón defensivo

```
1. wago_events_poll                        → recibe msg
2. wago_mark_read                          → ✓✓ azul
3. wago_chat_presence {state:"composing"}  → "está escribiendo…"
4. <LLM piensa>
5. wago_send_text                          → envía
6. wago_chat_presence {state:"paused"}     ← OPCIONAL, defensivo
```

### Patrón para LLMs lentos (>15s)

Si el proceso tarda más de 15s, el `composing` se cae por timeout.
Solución: keep-alive cada 10s mientras el LLM está pensando.

## Implementación

- `internal/mcp/tools_message.go`: tool nueva
  `wago_chat_presence` con la descripción de arriba.
- `internal/mcp/tools_test.go`:
  - `TestHumanBehaviorToolsPresent`: garantiza que `wago_mark_read` +
    `wago_chat_presence` estén en el catálogo.
  - `TestChatPresenceToolSendsPOST`: el handler hace POST a
    `/message/presence` con el body correcto (`number`, `state`,
    `isAudio`).
- `TestBuildToolsCatalog`: sigue pasando con 73 tools (era 72).

## Endpoint backend usado

`POST /message/presence` (ya existente, sin cambios):

```json
{
  "number": "5491100000000",
  "state": "composing",
  "isAudio": false
}
```

`state` válidos: `composing`, `paused`, `available` (de
`whatsmeow.types.ChatPresence`).

## Validación

- `go build ./...` PASS.
- `go test ./internal/mcp/... -count=1` PASS (catálogo + 2 tests
  nuevos).
- Smoke test end-to-end no se incluye acá (requiere WhatsApp real con
  un dispositivo destino para validar el indicador visible). El user
  debería probar en producción con su deploy.
