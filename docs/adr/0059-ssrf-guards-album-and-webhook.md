# 0059 - SSRF guards en `/send/album::downloadMedia` y `/webhook` URL

- Estado: aceptado
- Fecha: 2026-05-30
- Corrida Crisol: tech-debt-payoff-01 (cierra hallazgos #4 y #6 del
  audit de 3 agentes)
- Marker en código: `WAGO-PATCH(ADR-0059)`

## Contexto

El audit con 3 agentes paralelos sobre la rama `claude/build-webui-AcJFe`
identificó **2 vectores SSRF reales** explotables por un operador
autenticado:

### Vector 1 — `/send/album::downloadMedia`

`pkg/sendMessage/service/album.go::downloadMedia` hacía `http.Get(url)`
sobre URLs provistas en el body sin validar destino. Un operador con
token de instancia podía:

- Leer cloud metadata: `http://169.254.169.254/latest/meta-data/`
  (AWS IMDS, GCP metadata, Azure metadata).
- Pivotar a red interna: `http://localhost:8080/...`,
  `http://10.0.0.5/...`, `http://192.168.1.x/...`.
- Redirect-driven: el atacante sirve un 302 → host privado.

### Vector 2 — `/webhook` URL persistente

`pkg/webhook/service/webhook_service.go::validate` solo chequeaba
`u.Host != ""` y scheme http/https. Un operador podía configurar
webhook a `http://localhost/admin` → el dispatcher fire-and-forget
ejecutaba POST a esa URL en **cada evento de WhatsApp**, dando SSRF
persistente automatizado.

Ambos vectores son explotables con cualquier token de instancia válido
(no requieren admin GLOBAL_API_KEY). En modelo single-tenant son
mitigados por confianza en el operador, pero en multi-tenant o
exposición pública son críticos.

## Decisión

Implementar un guard común en ambos puntos:

1. **Scheme allowlist**: solo `http://` y `https://`.
2. **IP block ranges**: rechazar destinos en:
   - Loopback (`127.0.0.0/8`, `::1/128`)
   - Link-local (`169.254.0.0/16`, `fe80::/10`)
   - Private RFC1918 (`10/8`, `172.16/12`, `192.168/16`)
   - ULA IPv6 (`fc00::/7`)
3. **DNS-aware**: si el host es un nombre, resolverlo y aplicar el
   block sobre **todas** las IPs devueltas.
4. **Redirect-safe**: revalidar la URL en cada redirect (vector 1
   solamente — webhook dispatch no sigue redirects).
5. **Tolerante a hosts no resolvibles**: si DNS falla, NO bloquear —
   en runtime el dispatch fallará igual y no es vector SSRF
   (no se llega a la IP privada).

### Override para dev/testing

Variable `ALLOW_LOCAL_WEBHOOKS=true` en el entorno permite saltarse
el guard del webhook (no del album). Útil para dev con localhost,
NUNCA setear en producción.

### Implementación

- `pkg/sendMessage/service/album.go`:
  - `ssrfBlockedRanges`: slice de `*net.IPNet` con los CIDRs.
  - `isBlockedIP(ip)`: predicado.
  - `validateMediaURL(raw)`: parse + DNS resolve + check.
  - `downloadMedia`: llama `validateMediaURL` antes del `http.Get`
    y agrega `CheckRedirect` que revalida cada redirect.
- `pkg/webhook/service/webhook_service.go`:
  - `webhookBlockedRanges`: idéntica lista, replicada (no se importa
    del package sendMessage para evitar dependencia cruzada; si en
    el futuro hay un tercer punto, mover a `pkg/internal/netguard`).
  - `validateWebhookHost(u)`: lookup + check.
  - `validate()` (interno del service) llama `validateWebhookHost`
    cuando `os.Getenv("ALLOW_LOCAL_WEBHOOKS") != "true"`.

### Tests

`pkg/webhook/service/webhook_service_test.go` suma:
- `TestValidateBlocksSsrfWebhookURLs`: 6 URLs maliciosas
  (localhost, 127.0.0.1:8080, 10.0.0.5, 192.168.1.1, 172.16.0.10,
  169.254.169.254) → todas rechazadas con "rango".
- `TestValidateAllowsPublicWebhookURLs`: webhook.site, public.example
  → permitidas.
- `TestValidateAllowsLocalWhenEnvSet`: con `ALLOW_LOCAL_WEBHOOKS=true`,
  `localhost:9000/dev` permitido.

## Alternativas consideradas

- **Importar netguard común** en vez de duplicar la lista: descartada
  por ahora (2 callsites, evita ciclo de import). Refactor a
  `pkg/internal/netguard` cuando aparezca el tercer caller.
- **Allowlist explícita en vez de blocklist**: descartada (operador
  no puede prever todos los hosts públicos que va a usar).
- **Bloquear solo IPv4**: descartada — IPv6 ULAs/link-local son
  igualmente alcanzables en redes duales.
- **No tolerar fallos de DNS**: descartada — rompe tests existentes
  con hosts mock y no es vector SSRF (en runtime falla).

## Consecuencias

### Positivas

- Operadores no pueden usar webhook como proxy SSRF persistente ni
  album como SSRF puntual.
- Tests automatizados cubren los 3 cuadrantes (block / allow /
  override).
- Marker `WAGO-PATCH(ADR-0059)` para re-aplicar al mergear upstream.

### Negativas

- Setups donde el operador legítimamente necesita webhook a host
  privado (homelab, túnel ngrok hacia localhost) requieren setear
  `ALLOW_LOCAL_WEBHOOKS=true`. Documentado en código.
- DNS resolution suma latencia al `validate` (una vez por
  Create/Update de webhook — no en el hot path del dispatch).
- Lista de CIDRs duplicada en 2 packages (deuda menor a resolver con
  refactor a `netguard` cuando aplique).

### Neutras

- 3 tests nuevos suman ~10s al `go test ./...` (DNS lookup de
  webhook.site dentro del test).

## Validación

- `go test ./pkg/webhook/... -count=1` PASS incluye los 3 nuevos.
- `go build ./...` limpio.
- Album: tests del flujo end-to-end del SendAlbum siguen como
  deuda (sin cobertura, ver `docs/notes/0011`).

## Pendiente derivado

Race en `pkg/whatsmeow/service/whatsmeow.go::clientPointer` (map sin
mutex) — **no se aborda en esta corrida** porque requiere refactor de
37 ocurrencias en 5 packages (`whatsmeow`, `webhook/resolver`,
`community`, `user`, `label`). Esta ADR cierra los 2 SSRF; el race
queda en `docs/notes/0011-security-debt-deferred.md` punto 3.
