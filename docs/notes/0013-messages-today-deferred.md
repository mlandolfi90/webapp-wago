# 0013 — KPI "Mensajes hoy" (decisión: descartar, mantener placeholder `—`)

Nota técnica que registra la decisión de **descartar** la implementación
del contador "Mensajes hoy" en el Dashboard del panel, y la razón
técnica que lo hace innecesario por ahora.

## Contexto

El Dashboard del panel muestra 4 KPIs (Instancias, Conectadas, Mensajes
hoy, Webhooks activos). 3 de los 4 muestran datos reales obtenidos de
`/instance/all` + `/webhook` por instancia (ver `components/dashboard-
kpis.tsx`). El KPI "Mensajes hoy" muestra `—` como placeholder honesto
porque el backend Go no expone un counter de mensajes recibidos por día.

## Estado del backend (revisado, no especulado)

| Pieza | Estado real | Consecuencia |
|---|---|---|
| `pkg/message/model/message_model.go::Message.Timestamp` | tipo `string`, no `time.Time` | COUNT WHERE date eficiente requiere parsear strings (full scan) |
| `Message.InstanceID` | no existe | No se puede contar por instancia, solo global |
| `Message.CreatedAt` / índices DB | no existen | Cualquier COUNT por fecha es full table scan |
| `DATABASE_SAVE_MESSAGES` | default `false` | En instalaciones default no hay datos para contar |
| `InsertMessage` en `whatsmeow.go:1636,1661` | goroutine fire-and-forget | Sin manejo de errores, no se puede contar el fallo |
| Endpoint `/server/*` | solo `/server/ok` | Hay que crear ruta nueva desde cero |

## Decisión

**Descartar la feature por ahora**. El Dashboard mantiene el KPI con
`—` como placeholder honesto.

### Razones

1. **El modelo `Message` es deficiente** — el contador requeriría
   primero arreglar el schema (cambiar Timestamp a `time.Time` +
   agregar `InstanceID` + `autoCreateTime` + índice), que es breaking
   change con migración de datos.
2. **`DATABASE_SAVE_MESSAGES=false` por default** — instalaciones
   típicas no persisten mensajes, así que un counter basado en la
   tabla daría siempre `0` salvo que se active el flag.
3. **Las 3 opciones evaluadas tienen contras significativos** vs el
   beneficio (1 KPI más en el Dashboard):

   | Opción | Esfuerzo | Contras |
   |---|---|---|
   | Counter in-memory en server | ~50 LOC | Se reinicia con cada restart |
   | Persistir en `runtime_configs` | ~70 LOC | Write contention en el dispatcher |
   | Arreglar modelo `Message` | ~3 corridas Crisol | Breaking schema + migración |

4. **El KPI no es crítico para operar**. El operador puede observar
   actividad por logs del whatsmeow y/o por los webhooks que él mismo
   configura. La pérdida de información de un placeholder `—` en el
   Dashboard es marginal.

## Cuándo reabrir esta decisión

- Si se decide arreglar el modelo `Message` por otra razón
  (auditoría, búsqueda histórica, etc.), agregar el counter al
  mismo tiempo es trivial.
- Si el operador pide explícitamente la métrica.
- Si se llega a multi-tenant donde un KPI cuantitativo por inquilino
  es contractual.

## Implementación cuando se priorice

Para no perder el contexto del análisis, la opción recomendada cuando
se aborde sería **counter in-memory + endpoint nuevo** (no tocar el
modelo `Message`):

1. Crear `pkg/metrics/service/daily_counter.go` con
   `sync.Map[date]int` + método `Increment(date)` + `Today() int`.
2. Inyectar en `whatsmeow_service` (o leer directo desde el
   dispatcher de `CallWebhook`); incrementar en cada
   `*events.Message` recibido.
3. Cada incremento chequea si el `date` cambió → resetea al día
   nuevo lazy.
4. `server_handler` expone `GET /server/metrics/messages-today` con
   `{count: int, since: timestamp}`.
5. Frontend: agregar `useMessagesToday()` hook en
   `lib/queries/go/metrics/` + actualizar `DashboardKpis` para usarlo
   en vez del placeholder `—`.

Costo estimado: ~1.5 horas en una corrida del Crisol mediana.

Mientras tanto: el `—` queda en el Dashboard como placeholder honesto
con el `tip` del DashboardKpis ("Mensajes hoy pendiente de endpoint
backend").
