# 0011 — Deuda de seguridad pendiente (estado: parcialmente corregido)

Nota técnica que centraliza los hallazgos de seguridad detectados durante
el code-review automatizado del PR `claude/build-webui-AcJFe` (corrida
`code-review-blockers-fix-01`).

**Update 2026-05-30** (corrida `tech-debt-payoff-01`): los 2 hallazgos
HIGH de SSRF (puntos 1 y 5 originales) **fueron corregidos** vía
**ADR 0059**. Los puntos 3 y 4 (race y thundering-herd) siguen como
deuda. El punto 5 original (CORS) sigue como deuda menor.

## Modelo de despliegue declarado

**Hoy: single-tenant.** Un único operador (el dueño del backend o un
cliente único) controla la `GLOBAL_API_KEY` y todos los tokens de
instancia. El "atacante" del threat model sería el mismo operador →
escenario poco realista en self-hosted típico.

**Futuro: multi-tenant.** Confirmado por el user 2026-05-30. Cuando se
acepten varios clientes/operadores compartiendo el mismo backend (cada
uno con su token de instancia, sin conocerse entre sí), los pendientes
de este documento dejan de ser "deuda aceptada" y se vuelven blockers.

## Checklist pre-pivote a multi-tenant

Antes de habilitar 2+ operadores distintos compartiendo el backend,
abordar **TODOS** los siguientes (orden recomendado por criticidad):

- [ ] **Punto 3** (race `clientPointer`) — refactor a
      `pkg/whatsmeow/clientregistry.Registry`. Sin esto, race
      panickea el server bajo carga concurrente con dos tenants
      enviando simultáneo. **BLOCKER multi-tenant.**
      Plan ejecutable abajo. ~2-3h.
- [ ] **Punto 5** (CORS `*` + `Allow-Credentials:true`) — restringir
      `Access-Control-Allow-Origin` a allowlist por env var
      `CORS_ALLOWED_ORIGINS`. Browsers cumplidores ignoran la combo,
      pero clientes embebidos no — un tenant podría leer responses
      del otro vía SDK móvil. **BLOCKER multi-tenant.** ~30 min.
- [ ] **SendAlbum partial-failure** (issue #11b del audit final) —
      definir contrato: ¿devolver 207 Multi-Status con detalle por
      item? ¿reintentar? Decisión de producto. Sin esto, un tenant
      puede mandar 20 items, item 3 falla, los otros 19 quedan
      mandados sin recovery — soporte se desborda. **MEDIO multi-
      tenant.** ~1h decisión + 1-2h código.
- [ ] **Tests gaps** (issue #20b) — `webhook/repository`
      ownership tests (un tenant NO debe ver/modificar webhooks
      de otro), `whatsmeow.CallWebhook` con `isFromMe` cross-
      tenant. **MEDIO multi-tenant.** ~3h.
- [ ] **Auditoría de auth scope** — revisar que TODOS los
      endpoints `instance-scoped` usen `instanceFrom(ctx)` y NO
      acepten path params `:instanceId` que puedan ser
      manipulados por un tenant para acceder a otro. **BLOCKER
      multi-tenant.** ~2h.
- [ ] **Quota / rate-limiting** por token — sin esto, un tenant
      puede ejecutar mil `/send/album` y agotar memoria/RAM/
      conexiones del backend, afectando a los otros. **BLOCKER
      multi-tenant.** Decisión de diseño + ~4h código.
- [ ] **Logs sin leak cruzado** — verificar que los logger del
      `whatsmeow_service` y `webhook_service` no escriban tokens
      de instancias ajenas al log del otro tenant. ~1h auditoría.

## Threat model — por qué los pendientes están aceptados HOY

webapp-wago se despliega típicamente **self-hosted** por un único
operador que controla:

1. Quién tiene la `GLOBAL_API_KEY` (admin).
2. Quién tiene tokens de instancia.
3. La red donde corre (no es servicio público multi-tenant).

Los hallazgos abajo requieren que **el operador con token** decida
atacar el propio server o pasar el token a un tercero hostil. El
operador ES el atacante en el modelo de amenaza — escenario poco
realista en un setup típico. El user lo expresó claramente:
**"es muy difícil recibir un ataque por WhatsApp"**.

Igualmente quedan documentados para abordarse cuando webapp-wago se
exponga en escenarios multi-tenant o public-facing.

## Hallazgos

### 1. SSRF en `pkg/sendMessage/service/album.go` — ✅ CORREGIDO (ADR 0059)

**Status**: cerrado el 2026-05-30 vía ADR 0059. `downloadMedia` ahora
valida scheme + IP del destino + redirects. Sección abajo queda para
referencia histórica.

### 1.HIST (original) - SSRF en `pkg/sendMessage/service/album.go` — HIGH

**Archivo**: `pkg/sendMessage/service/album.go:88-107` (`downloadMedia`).

**Bug**: `http.Get(url)` directo sobre URL provista por el cliente, sin
allowlist de hosts ni bloqueo de rangos privados (10/8, 172.16/12,
192.168/16, 127/8, ::1, fc00::/7, 169.254/16). Un operador con token
de instancia puede pivotar a la red interna del server o leer el
metadata endpoint de la cloud (169.254.169.254 → AWS IMDS / GCP /
Azure metadata) y recuperar credenciales temporales.

**Cómo arreglarlo** (cuando se priorice):

```go
import "net"

func isPrivate(ip net.IP) bool {
    if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsPrivate() {
        return true
    }
    // 169.254.169.254 cloud metadata
    metadata := net.IPv4(169, 254, 169, 254)
    return ip.Equal(metadata)
}

func validateMediaURL(rawURL string) error {
    u, err := url.Parse(rawURL)
    if err != nil { return err }
    if u.Scheme != "https" && u.Scheme != "http" {
        return errors.New("solo http/https")
    }
    ips, err := net.LookupIP(u.Hostname())
    if err != nil { return err }
    for _, ip := range ips {
        if isPrivate(ip) {
            return errors.New("host privado bloqueado")
        }
    }
    return nil
}
```

Llamar `validateMediaURL` antes del `http.Get`.

### 2. Sin límites en `/send/album` — ✅ CORREGIDO (parcialmente)

**Status**: `io.LimitReader(res.Body, 64<<20)` (64 MB por archivo) ya
estaba en el código de `downloadMedia`. El cap de items por álbum sigue
pendiente — los handlers de send_album NO chequean `len(items)` antes
de procesarlos. Item para corrida futura.

### 2.HIST (original) - Sin límites en `/send/album` — HIGH

**Archivo**: `pkg/sendMessage/service/album.go:154-179`.

**Bug**: sin `if len(data.Items) > N`, sin `io.LimitReader(res.Body, MAX)`.
100 items × 50 MB = 5 GB en RAM por petición. Operador hostil puede
DoS-ear el server con una sola request.

**Cómo arreglarlo**:

```go
const (
    MaxAlbumItems       = 20
    MaxMediaSizeBytes   = 10 * 1024 * 1024 // 10 MB
)

if len(data.Items) > MaxAlbumItems {
    return fmt.Errorf("máximo %d items por álbum", MaxAlbumItems)
}
// En downloadMedia, envolver el body con LimitReader:
body, err := io.ReadAll(io.LimitReader(res.Body, MaxMediaSizeBytes))
```

### 3. Race condition en `clientPointer` — MEDIUM (pre-existente, plan detallado)

**Status 2026-05-30**: corrida `tech-debt-payoff-01` evaluó el refactor y
mide **55 ocurrencias** en **12 archivos** (pkg/whatsmeow, pkg/webhook/
resolver, pkg/instance, pkg/sendMessage, pkg/message, pkg/chat,
pkg/group, pkg/community, pkg/user, pkg/label, pkg/newsletter,
pkg/call). Demasiado invasivo para mezclar con otros fixes — se
abordará en corrida dedicada.

**Plan ejecutable** cuando se priorice:

```go
// pkg/whatsmeow/clientregistry/registry.go (NUEVO)
package clientregistry

type Registry struct { m sync.Map }
func (r *Registry) Get(id string) *whatsmeow.Client { ... }
func (r *Registry) Set(id string, c *whatsmeow.Client) { r.m.Store(id, c) }
func (r *Registry) Delete(id string) { r.m.Delete(id) }
func (r *Registry) Range(fn func(id string, c *whatsmeow.Client) bool) { ... }
```

1. Crear el package y el type.
2. En `cmd/webapp-wago/main.go`: cambiar
   `clientPointer := make(map[string]*whatsmeow.Client)` por
   `clientPointer := &clientregistry.Registry{}`.
3. Actualizar las **12 firmas de constructores** que aceptan
   `map[string]*whatsmeow.Client` → `*clientregistry.Registry`.
4. Reemplazos mecánicos (cada uno verificado, sin sed):
   - `clientPointer[id]` → `clientPointer.Get(id)`
   - `clientPointer[id] = c` → `clientPointer.Set(id, c)`
   - `delete(clientPointer, id)` → `clientPointer.Delete(id)`
   - `for id, c := range clientPointer` → `clientPointer.Range(func(id string, c *whatsmeow.Client) bool { ... })`
5. `go vet ./... && go test -race ./...` en cada paso.

Costo estimado: 1 corrida del Crisol Tier Completo (~2-3h).

### 3.HIST (original) - Race condition en `clientPointer` — MEDIUM

**Archivos**: `pkg/webhook/resolver/wago_resolver.go:26,46` +
`pkg/whatsmeow/service/whatsmeow.go:396,2668`.

**Bug**: `map[string]*whatsmeow.Client` se muta por whatsmeowService sin
mutex; el resolver lo lee concurrentemente desde el path Dispatch. Go
panickéa con "concurrent map read and map write" bajo carga.

**Cómo arreglarlo**:

Envolver el map en `sync.RWMutex` o cambiar a `sync.Map`:

```go
type clientRegistry struct {
    mu      sync.RWMutex
    clients map[string]*whatsmeow.Client
}

func (r *clientRegistry) Get(id string) *whatsmeow.Client {
    r.mu.RLock()
    defer r.mu.RUnlock()
    return r.clients[id]
}

func (r *clientRegistry) Set(id string, c *whatsmeow.Client) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.clients[id] = c
}
```

Reemplazar accesos directos `clientPointer[id]` por `registry.Get(id)`.

**Nota**: el bug es pre-existente al PR (viene de upstream Evolution
Go). La rama actual amplía la superficie porque el nuevo resolver lee
más en paralelo, pero no introdujo el race.

### 4. Thundering-herd en `webhookService.getCached` — LOW

**Archivo**: `pkg/webhook/service/webhook_service.go:301-314`.

**Bug**: lazy-load con doble `RLock` + intermedio sin lock; si 2
requests entran simultáneamente con cache fría, ambos disparan
`Reload` (2 queries DB). No es bug, solo trabajo redundante.

**Cómo arreglarlo**: `golang.org/x/sync/singleflight` para colapsar
loads concurrentes.

### 5. CORS `*` + `Allow-Credentials: true` — LOW (pre-existente)

**Archivo**: `pkg/routes/routes.go:48-62`.

**Bug**: combinación no soportada por browsers cumplidores (las
credenciales se ignoran), pero algunos clientes embebidos sí la
respetan. Si un atacante en otra página tiene al usuario logueado en
la misma sesión, en clientes laxos podría leer responses.

**Cómo arreglarlo**: restringir `Access-Control-Allow-Origin` a una
lista blanca (env var `CORS_ALLOWED_ORIGINS=https://wago.midominio.com`)
y solo poner `Allow-Credentials: true` cuando el origin matchee.

### 6. SSRF persistente en `/webhook` URL — ✅ CORREGIDO (ADR 0059)

**Status**: cerrado el 2026-05-30 vía ADR 0059. `webhook_service.validate`
ahora rechaza URLs apuntando a rangos privados/loopback/IMDS. Override
con `ALLOW_LOCAL_WEBHOOKS=true` para dev/testing.

## Cuándo abordar

Cualquiera de los siguientes triggers debería abrir una corrida del
Crisol específica:

- webapp-wago se expone como **servicio multi-tenant** (varios
  operadores con tokens distintos).
- El backend se pone detrás de un proxy **público en internet** sin
  authn extra al nivel de red.
- Un consumidor del webhook reporta haber recibido un payload
  malformado de RAM-leak (síntoma del item 3).
- Se observa duplicación de queries en logs del DB (síntoma del item 4).
- Se agregan **integraciones de terceros** que llamen al backend desde
  un dominio diferente (item 5).

Mientras tanto, los 5 quedan como deuda explícita y aceptada.
