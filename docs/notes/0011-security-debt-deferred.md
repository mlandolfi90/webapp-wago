# 0011 — Deuda de seguridad pendiente (decisión: postergar)

Nota técnica que centraliza los hallazgos de seguridad detectados durante
el code-review automatizado del PR `claude/build-webui-AcJFe` (corrida
`code-review-blockers-fix-01`) que **deliberadamente NO se corrigen** en
este momento.

## Threat model — por qué se postergan

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

### 1. SSRF en `pkg/sendMessage/service/album.go` — HIGH

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

### 2. Sin límites en `/send/album` — HIGH

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

### 3. Race condition en `clientPointer` — MEDIUM (pre-existente)

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
