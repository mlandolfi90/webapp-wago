# 0031 - Layout de la tarjeta de instancia: acciones agrupadas

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: webui-cardux-001 (tier completo)

## Contexto y problema

Tras cubrir todos los dominios de la API, `instanceCard.js` acumuló
~15 botones en un único `.card-actions` (un muro de botones sin
jerarquía: mezclaba gestión de sesión, operaciones de dominio y acciones
destructivas). Difícil de escanear y peligroso (Borrar junto a todo).

## Decisión

Se agrupan las acciones en **tres secciones etiquetadas** dentro de la
tarjeta, vía un helper local `actionGroup(label, buttons)`:

- **Sesión**: Conectar, QR, Estado, Avanzado, Proxy.
- **Operar**: Enviar, Grupos, Contactos, Mensajes, Comunidades,
  Etiquetas, Newsletters, Utilidades.
- **Zona peligro**: Desconectar, Borrar.

Cambio **UI-only**: cada botón conserva su `onclick` y comportamiento
exactos; solo cambia el envoltorio/visual. CSS aditivo
(`.action-group`, `.action-group-label`) con tokens del tema
(ADR 0021). El helper vive local en `instanceCard.js` (es específico de
la tarjeta; no amerita módulo compartido).

## Alternativas consideradas

- **Menú desplegable / "kebab"**: descartado por ahora; agrega estado y
  manejo de foco/teclado en vanilla para una ganancia marginal frente a
  secciones simples. Queda como posible mejora futura si crece más.
- **Dejar el muro de botones**: descartado; problema de UX real
  reportado por el usuario.
- **Helper compartido para grupos de acción**: innecesario; solo lo usa
  la tarjeta (evitar abstracción prematura, ADR 0020).

## Consecuencias

- Positivas: tarjeta escaneable, jerarquía clara, acciones destructivas
  visualmente separadas; cero cambio de comportamiento (no-regresión);
  sin tocar backend ni contratos.
- Negativas: la tarjeta es algo más alta (tres bloques con etiqueta);
  aceptable frente a la legibilidad ganada.
- Neutras: si en el futuro se agregan más dominios, entran en "Operar"
  sin nuevo andamiaje.
