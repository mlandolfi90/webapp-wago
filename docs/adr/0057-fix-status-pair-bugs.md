# 0057 - Fix Status + Pair: contratos observables del instance service

- Estado: aceptado
- Fecha: 2026-05-30
- Corrida Crisol: backend-status-pair-bugs-fix-01 (tier completo)
- Marker en código: `WAGO-PATCH(ADR-0057)`
- Descubrimiento: corrida `webui-pair-by-phone-01` (commit 90a13c3) reveló
  ambos bugs durante la verificación E2E con Playwright.

## Contexto

Durante la implementación del UI pair-by-phone (corrida anterior), se
descubrieron 2 bugs observables en el servicio de instancia que afectan
directamente la experiencia del frontend:

### Bug 1: `Status()` reporta `Connected:true` sin sesión real

`pkg/instance/service/instance_service.go:373` usaba
`client.IsConnected()` que retorna `true` apenas el cliente whatsmeow
inicializa el socket TCP — **antes de que exista una sesión vinculada
al WhatsApp**. El frontend interpretaba `Connected:true` como
"instancia ya vinculada" y ocultaba la UI de pareo (QR + pair-by-phone),
dejando al usuario sin forma de vincular.

Inconsistencia con `GetAll()` (línea 481-489) que usa
`client.IsLoggedIn()` para el campo `Instance.Connected`. La UI veía
`Connected:false` en la lista y `Connected:true` en el detalle de la
misma instancia.

### Bug 2: `Pair()` devuelve `PairingCode:""` silenciosamente

`pkg/instance/service/instance_service.go:463`:

1. **Nil-unsafe**: `i.clientPointer[instance.Id].PairPhone(...)` paniqueaba
   con nil pointer si la instancia nunca había llamado a Connect.
2. **Traga errores**: cuando `PairPhone` retornaba error, lo logueaba
   pero NO lo propagaba al caller — devolvía el `code` (vacío) igual.
3. **Code vacío sin error**: el handler respondía 200 + `data.PairingCode:""`
   sin distinguir éxito de fallo. El frontend creía haber generado un
   código vacío válido.

## Decisión

### Status — `Connected: isLoggedIn`

Cambiar `isConnected := client.IsConnected()` por usar directamente
`isLoggedIn := client.IsLoggedIn()` y popular ambos campos del
`StatusStruct` con el mismo predicado:

```go
isLoggedIn := client.IsLoggedIn()
status := &StatusStruct{
    Connected: isLoggedIn,  // antes: client.IsConnected()
    LoggedIn:  isLoggedIn,
    // ...
}
```

Consistente con `GetAll()`. Si un cliente futuro necesita el TCP-level
agregamos un campo nuevo (`TcpReady` o similar) — no rompemos
`Connected` que ya tiene la semántica que el usuario espera.

### Pair — nil-safe + propagar errores + detectar code vacío

```go
func (i instances) Pair(data *PairStruct, instance *instance_model.Instance) (*PairReturnStruct, error) {
    client := i.clientPointer[instance.Id]
    if client == nil {
        return nil, fmt.Errorf("instance %s no está conectada — llamá Connect primero", instance.Id)
    }
    code, err := client.PairPhone(context.Background(), data.Phone, true, ...)
    if err != nil {
        i.loggerWrapper.GetLogger(instance.Id).LogError("[%s] PairPhone falló: %v", instance.Id, err)
        return nil, fmt.Errorf("PairPhone falló: %w", err)
    }
    if code == "" {
        return nil, fmt.Errorf("PairPhone devolvió código vacío — el cliente whatsmeow no está listo, reintentá tras Connect")
    }
    return &PairReturnStruct{PairingCode: code}, nil
}
```

El handler ya transforma errores del service en HTTP 500 con
`{"error": err.Error()}`, así que automáticamente el frontend recibe
mensajes claros.

## Alternativas consideradas

- **Devolver 503 en vez de 500 para "Connect primero"**: descartada por
  minimal disruption. El handler genérico devuelve 500 para todos los
  errores del service y el frontend muestra `error.message` en el
  toast — el código HTTP no se usa para diferenciar UX.
- **Agregar `TcpReady` field al StatusStruct y dejar `Connected` como
  está**: descartada. Inconsistencia con `GetAll()` quedaba sin
  resolver. El cambio actual converge ambos endpoints en el mismo
  predicado, simplifica el contrato.
- **Mantener nil-safe en `Pair` pero seguir tragando errores**:
  descartada. Los errores silenciosos son la peor categoría — el
  cliente recibe code vacío y no sabe si reintentar o si pasó algo
  raro. Propagar es estricto pero claro.

## Consecuencias

### Positivas

- El frontend pair-by-phone muestra correctamente la UI sin confusión.
- Los toasts del frontend reciben mensajes accionables ("llamá Connect
  primero", "el cliente no está listo, reintentá").
- Operadores y clientes MCP que usan `/instance/status` programáticamente
  reciben datos consistentes con `/instance/all`.
- Marker `WAGO-PATCH(ADR-0057)` permite re-aplicar el cambio al mergear
  upstream Evolution Go.

### Negativas

- **Breaking change menor del contrato**: clientes que asumían que
  `/instance/pair` devuelve siempre 200 ahora reciben 500 en condiciones
  precondicionales. **Mitigación**: el comportamiento previo era un
  bug silencioso (200 + code vacío); cualquier cliente que dependía de
  eso ya estaba roto sin saberlo.
- Clientes que dependían de `/instance/status.Connected` para detectar
  el socket TCP ya no lo tienen. Pre-fix nadie debería estar usando ese
  flag para eso (la semántica histórica del nombre sugiere
  "vinculado"), pero se documenta como posible regression vector.

### Neutras

- Los 2 cambios son local-only en `instance_service.go`. Sin migración
  de datos. Sin cambios en handlers ni rutas. Sin cambios en tipos del
  contrato JSON.

## Validación

E2E con curl + Playwright contra Wago + Postgres reales:

- `GET /instance/status` sobre instancia recién creada (sin Connect)
  ahora devuelve `Connected:false LoggedIn:false`. Antes:
  `Connected:true LoggedIn:false`.
- `POST /instance/pair` directo (sin Connect previo) ahora devuelve
  HTTP 500 con `{"error":"instance <id> no está conectada — llamá
  Connect primero"}`. Antes: HTTP 200 + `{"data":{"PairingCode":""}}`.
- `POST /instance/pair` tras `/instance/connect` o `/instance/status`
  (que vivifican el client) sigue devolviendo HTTP 200 con código no
  vacío (verificado con curl: `"PairingCode":"DJFM-HFHV"`).
- Suite Playwright pair-by-phone: 11/11 PASS (incluye check 3 que ahora
  verifica el 500 con mensaje "llamá Connect").
- Suite Playwright Dashboard KPIs: 11/11 PASS sin regresión.

## Pendiente — deuda derivada (NO se aborda en esta corrida)

El `whatsmeow_service` y el `clientPointer` map siguen sin lock
(documentado en `docs/notes/0011-security-debt-deferred.md` punto 3).
Cualquier corrida que toque la lógica del client pool debería abordar
ese race al mismo tiempo. No es scope de este ADR porque toca otro
package y es bug pre-existente.
