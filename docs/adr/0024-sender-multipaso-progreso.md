# 0024 - Sender multi-paso con reporte de progreso

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: webui-seqsend-001 (tier completo)

## Contexto y problema

WhatsApp/whatsmeow no soporta enviar un **álbum** real (ver chat de
diseño: issue upstream tulir/whatsmeow #1103 cerrado "not planned"; el
fork tampoco lo expone). El caso de uso "mandar varias fotos juntas" se
resuelve, por ahora, enviando varios `/send/media` **en secuencia**. El
compositor (ADR 0023) asumía senders de **un solo paso**:
`api(token, body) -> Promise`, una llamada, un resultado.

## Decisión

Se **extiende el contrato del sender** de forma retrocompatible:

    api(token, body, onProgress?) -> Promise

- `onProgress(hecho, total)` es **opcional**. Los senders de un paso lo
  ignoran (no cambian); el orquestador siempre lo pasa, JS descarta el
  argumento extra → cero ruptura.
- Nuevo tipo declarativo `sequential` ("Varios (secuencial)") en
  `send/senders.js`: su `api` encadena `sendMedia` por cada URL (una por
  línea), con pausa configurable entre envíos, invocando `onProgress`
  antes de cada uno. **Compone `sendMedia` existente**: no agrega
  endpoint ni toca el backend.
- El orquestador `send/sendModal.js` pasa un `onProgress` que actualiza
  la etiqueta del botón (`Enviando 2/5...`). El progreso se centraliza
  ahí (no se duplica en cada sender).
- En error, el sender rechaza con mensaje contextual
  (`Falló en 3/5 (url): <causa>`) preservando `status`.

El tipo deja explícito en su ayuda que **no es un álbum**: llegan como
mensajes seguidos (limitación real del protocolo, documentada).

## Alternativas consideradas

- **Toast por cada archivo**: descartado. Spam visual; los toasts se
  apilan/expiran. El progreso en el botón es un único punto estable.
- **Cambiar la firma a un objeto `{onProgress}` o callbacks múltiples**:
  descartado por sobre-ingeniería; un 3er arg opcional basta y es
  idiomático.
- **Endpoint backend `/send/album` o `/send/batch`**: descartado en este
  incremento (es trabajo de protocolo/Go; quedó como tarea interna
  futura). El front compone el endpoint que ya existe.
- **Romper el orquestador para manejar N llamadas**: descartado; metería
  lógica multi-paso en el componente agnóstico. La iteración vive en el
  sender (responsabilidad única, ADR 0020).

## Consecuencias

- Positivas: resuelve el 90% del caso "varias fotos" sin backend; el
  contrato sender ahora admite multi-paso para futuros tipos; retro-
  compatible (los 7 senders previos intactos); reusa `sendMedia` y el
  patrón ADR 0023; progreso visible.
- Negativas: no es un álbum (mensajes sueltos) — explicitado en la UI;
  un fallo a mitad deja los anteriores ya enviados (se informa cuál
  falló, no hay rollback posible en WhatsApp).
- Neutras: la pausa por defecto (1200 ms) es heurística; ajustable por
  el usuario.
