# 0039 - Álbum propagado a MCP y webui

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: album-propagate-001 (tier completo)

## Contexto

`send-album-001` (ADR 0038) dejó el endpoint backend `POST /send/album`
funcionando (verificación estática; validación real pendiente del
humano). Faltaba exponerlo en las otras dos capas para no divergir el
contrato entre componentes.

## Decisión

Propagación **aditiva**, sin tocar el backend (contrato congelado:
`{number, items:[{type,url}], caption?}`):

- **MCP**: tool `wago_send_album` en `internal/mcp/tools_send.go`
  (valida ≥2 items, cada uno `{type:image|video, url}`, caption
  opcional) → `POST /send/album` vía `wago.Do`.
- **core/api.js**: `sendAlbum(token, body)`.
- **webui**: nuevo tipo "Álbum" en el catálogo `send/senders.js`, con
  helper puro `parseAlbumItems` (una línea = `tipo|url`), validación
  (≥2, líneas válidas) y `helpHint`. El orquestador agrega `number`.

## Alternativas consideradas

- **UI con filas dinámicas (add/remove) por ítem**: descartado por
  alcance; `tipo|url` por línea es consistente con el patrón ya usado
  (envío secuencial) y suficiente.
- **Reusar el sender "Varios (secuencial)"**: descartado; secuencial =
  N mensajes sueltos, álbum = agrupado real. Semánticas distintas.
- **Tocar backend**: innecesario; el contrato ya existe.

## Verificación (honesta)

- `go build/vet/test` verdes; test MCP nuevo: `wago_send_album` arma el
  body (items normalizados, caption opcional, rechaza <2 / item
  inválido). `node --check` de la webui OK; render del form "Álbum".
- **PENDIENTE (heredado de ADR 0038)**: que WhatsApp lo muestre
  realmente agrupado es validación de dispositivo, a cargo del humano.
  Esta corrida solo propaga el contrato ya definido.

## Consecuencias

- Positivas: álbum disponible en las 3 capas con el mismo contrato;
  cero divergencia; aditivo; patrones reusados.
- Negativas: ninguna nueva; la incertidumbre de protocolo sigue siendo
  la de ADR 0038 (validación real del humano).
