# 0048 - Webhook filter por NOMBRE de grupo/contacto (opción C)

- Estado: aceptado
- Fecha: 2026-05-27
- Corrida Crisol: multi-webhook-name-filter-001 (tier completo,
  2 carriles disjuntos)

## Contexto

El caso de uso original que disparó toda la saga (ADR 0045/0046/0047):
**"todo grupo cuyo nombre empieza con Harness, incluso uno creado
mañana"**. ADRs previos cubrieron:

- ADR 0045: N webhooks con filtros JID inline.
- ADR 0046: wildcards glob en JIDs (`*@g.us`, `549*`) + picker UI.
- ADR 0047: visualización `Nombre <JID>`.

Ninguno cubre el caso real. JIDs de grupos son numéricos (`120363...`)
→ `Harness*@g.us` matchea cero. Picker con JIDs explícitos →
estático, no atrapa grupos futuros. Honestidad ingenieril: lo
informé al usuario, y pidió implementar la C.

## Decisión

Dos dimensiones nuevas en el filtro inline: **`chatNames`** y
**`senderNames`** (allowlists de patrones glob sobre nombres
humanos). El backend resuelve nombre desde whatsmeow on-demand
(lazy + cache + invalidación por eventos).

### Cambios al model

```go
type Webhook struct {
    // ... existente ...
    ChatNames   []string `json:"chatNames" gorm:"serializer:json"`
    SenderNames []string `json:"senderNames" gorm:"serializer:json"`
}
```

### Matcher unificado

`matchAllowlist` se renombra `matchPatternAllowlist` (misma lógica
exact/glob) y se reusa para 4 dimensiones: JIDs (chatIds/senders) y
nombres (chatNames/senderNames). `MatchesFilter` agrega 2 args:
`chatName`, `senderName`. Si `chatNames` no vacío + `chatName=""`
→ rechaza (semántica consistente con allowlists de JID).

### NameResolver (interface + implementación separada)

Interface en `pkg/webhook/service`:

```go
type NameResolver interface {
    GroupNames(ctx, instanceID) (map[jid]name, error)
    ContactNames(ctx, instanceID) (map[jid]name, error)
}
```

Implementación en paquete nuevo **`pkg/webhook/resolver/`**
(`wago_resolver.go`) que recibe el `clientPointer map[string]*
whatsmeow.Client` (mismo que usa whatsmeowService) y llama:

- `client.GetJoinedGroups(ctx)` → JID → `GroupName.Name`
- `client.Store.Contacts.GetAllContacts(ctx)` → JID → FullName/
  PushName/BusinessName (fallback en ese orden).

Vive en su propio paquete para evitar ciclo:
`pkg/whatsmeow/service` ya importa `pkg/webhook/service` (Dispatch);
si la implementación viviera ahí, el ciclo cerraba.

### Cache + invalidación

`webhookService` mantiene `nameCache map[instanceID]*instanceNames`
con flags `groupsLoaded`/`contactsLoaded` por instancia. Lazy load
en el primer `groupName`/`contactName` que lo necesite.

Invalidación: `whatsmeowService.maybeInvalidateNames(instanceID,
eventType)` se invoca al final de `CallWebhook` y descarta el cache
si `eventType` ∈ {`Contact`, `PushName`, `GroupInfo`, `JoinedGroup`,
`Connected`}. Próximo dispatch re-resuelve.

Método público en `WhatsmeowService.InvalidateWebhookNames(id)` para
casos donde otros componentes necesiten invalidar manualmente.

### Performance — corto-circuito

`Dispatch` itera los webhooks de la instancia; **solo si alguno tiene
`ChatNames` o `SenderNames` no vacío** entra al lookup de nombres.
Webhooks que filtran solo por JID/tipo/evento: cero costo añadido.

### WebUI

`webhookForm.js` agrega 2 textareas (`chatNames`, `senderNames`) con
helpHints explicando el caso `Harness*`. La lista muestra el resumen
extendido (`nombres grupo: Harness*, Soporte*`).

### MCP

`tools_webhooks.go`: `wago_webhook_create`/`update` aceptan
`chatNames` y `senderNames` (arrays de strings). Schema actualizado.

## Alternativas consideradas

- **Eager-load del cache al StartInstance**: descartado. Costo
  innecesario si la instancia no usa filtros de nombre. Lazy es
  óptimo.
- **TTL en lugar de invalidación por evento**: descartado. Con
  invalidación por evento el filtro siempre ve nombres actuales
  (modulo race ínfimo). TTL agregaría incertidumbre + un goroutine.
- **Incremental update del cache** (al recibir `GroupInfo` para JID
  X, actualizar solo X): descartado. Más código por ganancia
  marginal. Invalidación full es robusta y barata (próximo dispatch
  refetchea de una sola llamada).
- **Filtrar por nombre en la UI** (cliente filtra antes de enviar al
  backend): inválido — la UI no recibe los eventos en runtime, los
  recibe el receptor del webhook después del filtro. El filtrado
  TIENE que ser backend.

## Consecuencias

- **Positivas**: el caso original (`Harness*` matchea grupos
  presentes y futuros) por fin funciona. Cero costo si no se usa
  (corto-circuito). API REST sin cambios destructivos —
  retrocompat 100%. Tests con `-race` cubren cache, invalidación,
  matching, corto-circuito.
- **Negativas**: superficie nueva en `WhatsmeowService` interface
  (`InvalidateWebhookNames`) — método extra a mockear en tests del
  interface. Toleramos: es 1 método y el patrón del Dispatch ya
  estableció el precedente.
- **Neutras**: extiende ADR 0045 sin reescribirlo; el paquete
  `webhook/resolver/` queda reusable.
