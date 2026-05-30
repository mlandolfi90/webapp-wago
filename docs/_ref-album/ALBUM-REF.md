# ALBUM-REF.md — Reconstrucción de álbumes de WhatsApp

> Material de **referencia** aportado por el usuario (extraído de otro
> proyecto propio, lado RECEPTOR). Sirve como contrato del protocolo para
> implementar el lado EMISOR (enviar álbum) en whatsmeow/Go + backend +
> webui. Secretos redactados como `<REDACTED>`. No es código del proyecto;
> es documentación de apoyo para una corrida futura (capa whatsmeow).
> Verificado: los símbolos proto citados existen en el whatsmeow pinneado
> del proyecto (`whatsmeow-lib` HEAD 0923702, waE2E).

---

## 1. Stack (proyecto de origen)

| Item | Valor |
|---|---|
| Lenguaje bridge | Go 1.25.0 |
| Librería WhatsApp | `go.mau.fi/whatsmeow` |
| Versión exacta whatsmeow | `v0.0.0-20260427122815-7514259253a7` (commit `7514259253a7`, 2026-04-27) |
| Protobuf runtime | `google.golang.org/protobuf v1.36.11` |
| Proto E2E | paquete `waE2E` (contiene `AlbumMessage`, `MessageAssociation`, `MessageContextInfo`) |
| Reconstrucción | NO en el bridge; en webapp Python al leer mensajes |

---

## 2. Lógica de reconstrucción (resumen del receptor)

- El bridge clasifica `Message.AlbumMessage != nil` como tipo `"album"`
  (parent) y desenvuelve el wrapper `AssociatedChildMessage` (HD dual
  upload), dejando el tag `associated_child` dentro de `raw_proto_json`.
- La webapp agrupa: por cada parent `album`, absorbe hijos `image/video`
  del mismo `sender` + misma dirección, dentro de ventana de timestamp,
  exigiendo el tag `associated_child` (Pase 1 fuerte) o ventana
  `-1/+5 s` como fallback (Pase 2).
- Caption y `quoted` (reply) van en el **primer hijo**, no en el parent;
  la webapp los hereda hacia el parent.
- Dedup de replies: un álbum-respuesta genera N hijos al mismo target.

> El receptor de origen usa heurística (sender+ts+substring) porque
> consume; el **emisor** debe poblar el vínculo fuerte del proto.

---

## 3. Contrato del protocolo (lo que el EMISOR debe producir)

### Structs proto relevantes (existen en el whatsmeow del proyecto)

`AlbumMessage` — `Message` campo proto **83** (`albumMessage`):

```go
type AlbumMessage struct {
    ExpectedImageCount *uint32      // campo 2
    ExpectedVideoCount *uint32      // campo 3
    ContextInfo        *ContextInfo // campo 17
}
```

`AssociatedChildMessage` — `Message` campo proto **91**, tipo
`*FutureProofMessage` (envuelve el media HD en dual-upload).

`MessageAssociation` — vínculo lógico hijo→padre:

```go
type MessageAssociation struct {
    AssociationType  *MessageAssociation_AssociationType // campo 1
    ParentMessageKey *waCommon.MessageKey                // campo 2
    MessageIndex     *int32                              // campo 3
}
```

`MessageContextInfo` — contenedor del `MessageAssociation`, campo proto
**10** (`messageAssociation`).

Enum `MessageAssociation_AssociationType` (valores álbum):

```
UNKNOWN                = 0
MEDIA_ALBUM            = 1
HD_VIDEO_DUAL_UPLOAD   = 5
HD_IMAGE_DUAL_UPLOAD   = 10
HEVC_VIDEO_DUAL_UPLOAD = 19
```

### Receta de envío (deterministica, derivada del receptor)

1. **Parent**: enviar un `Message` con `AlbumMessage` poblado
   (`ExpectedImageCount`, `ExpectedVideoCount`). Capturar su
   `MessageKey` (id del mensaje enviado).
2. **N hijos**: por cada media, enviar un `imageMessage`/`videoMessage`
   normal, pero seteando en el `Message` top-level
   `MessageContextInfo.MessageAssociation` con:
   - `AssociationType = MEDIA_ALBUM` (1) — variante básica.
   - `ParentMessageKey` = MessageKey del parent del paso 1.
   - `MessageIndex` = orden 0,1,2,…
3. **Primer hijo**: lleva `caption` y, si es reply, el `quoted`/
   `contextInfo` — no el parent.
4. HD dual-upload (opcional, avanzado): usa `AssociatedChildMessage`
   (campo 91) + `AssociationType` `HD_IMAGE_DUAL_UPLOAD=10` /
   `HD_VIDEO_DUAL_UPLOAD=5`. La variante básica `MEDIA_ALBUM` no lo
   requiere.

---

## 4. Campos clave para vincular hijos al álbum

| Campo | Tipo | Rol |
|---|---|---|
| `Message.AlbumMessage` (83) | `*AlbumMessage` | Marca el mensaje **parent** |
| `AlbumMessage.ExpectedImageCount` (2) | `*uint32` | Conteo esperado de imágenes |
| `AlbumMessage.ExpectedVideoCount` (3) | `*uint32` | Conteo esperado de videos |
| `MessageContextInfo.MessageAssociation` (10) | `*MessageAssociation` | Vínculo del **hijo** al álbum |
| `MessageAssociation.AssociationType` (1) | enum | `MEDIA_ALBUM=1` (básico) / HD variants |
| `MessageAssociation.ParentMessageKey` (2) | `*waCommon.MessageKey` | Apunta al id del parent (determinista) |
| `MessageAssociation.MessageIndex` (3) | `*int32` | Orden del hijo (0..n-1) |

> **Vínculo robusto para el emisor:** `MessageContextInfo.MessageAssociation`
> con `AssociationType=MEDIA_ALBUM`, `ParentMessageKey` = key del
> `AlbumMessage`, `MessageIndex` = orden. (El receptor de origen no lo
> usa porque consume con heurística; el emisor SÍ debe poblarlo.)

---

## 5. Muestra cruda

No hay fixtures/proto JSON commiteados en el proyecto de origen. Única
evidencia (bitácora, IDs redactados):

```
Albums: <REDACTED_ID> (expectedImageCount=2) -> hijos <REDACTED_ID> + <REDACTED_ID>
Diagnóstico: las "imágenes pegadas" son N imageMessage separados
+ 1 albumMessage parent, NO 1 mensaje con N imágenes.
```

---

## 6. Notas y casos borde

- Álbum mixto imagen+video: soportado (`ExpectedImageCount` y
  `ExpectedVideoCount` separados).
- El conteo existe en el proto pero el receptor de origen no lo valida.
- Parent puede preceder a los hijos por segundos (timing de envío).
- Caption/reply en el **primer hijo**.
- Un hijo no debe ser absorbido por dos parents (índice único).
- El bridge de origen NO emite el vínculo fuerte (solo consume); el
  emisor debe **generarlo explícitamente**.

---

## 7. Gaps para el lado EMISOR (a resolver en la corrida whatsmeow)

1. Confirmar que `whatsmeow.SendMessage` (o construcción manual del
   `Message`) permite setear `MessageContextInfo.MessageAssociation` y
   enviar un `AlbumMessage` crudo, o si hace falta un helper nuevo.
2. Secuencia/timing real: parent primero (y obtener su `MessageKey`)
   luego los hijos referenciándolo; espaciado entre envíos.
3. Upload+cifrado por media: reusar el pipeline de `sendMedia` de
   whatsmeow para cada hijo (no reinventar).
4. Validación contra WhatsApp real (teléfono del usuario): que llegue
   agrupado como álbum, no como N mensajes sueltos. Iteración real.
