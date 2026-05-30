# 0038 - Envío de álbum real (backend)

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: send-album-001 (tier completo)

## Contexto y problema

Faltaba enviar varias fotos/videos como **álbum** real (no N mensajes
sueltos). El contrato del protocolo estaba documentado en
`docs/_ref-album/ALBUM-REF.md` (aporte del usuario): un `AlbumMessage`
padre + N hijos media con
`MessageContextInfo.MessageAssociation{MEDIA_ALBUM, ParentMessageKey,
MessageIndex}`. whatsmeow no expone un helper `SendAlbum`, pero los tipos
proto existen.

## Decisión

Implementar **solo en el backend webapp-wago**, usando la **API pública**
de whatsmeow (`Upload` + `SendMessage` + proto `waE2E`/`waCommon`),
**sin parchear el submódulo** (ADR 0036: código aditivo).

- `pkg/sendMessage/service/album.go`:
  - `buildAlbumParent(img,vid)` y `buildAlbumChild(media,idx,parentKey,
    caption,isVideo)` — **funciones puras** (testeables sin red/cliente)
    que arman el `*waE2E.Message` exacto del contrato.
  - `SendAlbum`: valida, envía el padre, captura `parentResp.ID` →
    `waCommon.MessageKey{RemoteJID,FromMe:true,ID}`, y por cada item
    descarga+`Upload`+envía el hijo con la asociación (caption solo en
    `i==0`, per ALBUM-REF).
- `SendService` (+`SendAlbum`), handler `SendAlbum`, ruta
  `POST /send/album` (mismo middleware que el resto de `/send/*`).
- Alcance **solo backend**; MCP/webui en corrida siguiente (evita un
  cambio monolítico y aísla la parte de protocolo incierta).

## Alternativas consideradas

- **Patchear whatsmeow (submódulo) con un `SendAlbum`**: descartado;
  la API pública alcanza y parchear el submódulo causaría divergencia
  (ADR 0036). El lugar correcto es el caller.
- **Refactorizar `SendMediaUrl` (≈250 líneas) para reusar su
  download+upload**: descartado por riesgo/alcance; se usa un
  `downloadMedia` propio acotado + `client.Upload`. Duplicación mínima
  y consciente (no se entangla un método gigante en caliente).
- **HD dual-upload (`AssociatedChildMessage`)**: fuera de alcance; se
  implementa la variante básica `MEDIA_ALBUM` (suficiente para agrupar).
- **MCP/webui en la misma corrida**: descartado; el protocolo del álbum
  es lo incierto — se aísla y prueba primero el contrato backend.

## Verificación (honesta)

- `go build/vet/test` verdes; los **builders puros** quedan cubiertos
  por test unitario (counts del padre; del hijo: AssociationType=
  MEDIA_ALBUM, ParentMessageKey, MessageIndex; caption solo en i=0;
  image vs video).
- **PENDIENTE — validación real**: sin dispositivo en el sandbox no se
  puede confirmar que WhatsApp lo muestre **agrupado** como álbum. Queda
  a cargo del humano. Se commitea igual (contenedor efímero; criterio
  acordado) con el check real **explícitamente abierto** en RUN-LEDGER.
  Es la parte de mayor incertidumbre (ingeniería de protocolo).

## Consecuencias

- Positivas: `/send/album` funcional según el contrato documentado; cero
  deps/patches al submódulo; lógica de protocolo aislada y testeada;
  base lista para exponer en MCP/webui.
- Negativas: validación end-to-end depende del humano (intrínseco: no
  hay WhatsApp real acá); duplicación menor del download/upload (anotada).
- Abierto: confirmar agrupación real en WhatsApp; luego propagar a
  MCP (`wago_send_album`) y webui (tipo "Álbum" en el compositor).
