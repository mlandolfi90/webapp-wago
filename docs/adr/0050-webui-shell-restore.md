# 0050 - Restaurar look "WebAPP-Wago" (shell con sidebar + topbar + footer)

- Estado: aceptado
- Fecha: 2026-05-28
- Corrida Crisol: webui-restyle-webapp-001 (tier completo, Fase 1)

## Contexto

El usuario reportó que extrañaba el look del panel previo al rebuild
vanilla (ADR 0019): branding "WebAPP-Wago" verde brillante, sidebar fija
con `Dashboard` + `Instâncias`, topbar con `Swagger` + `Salir`, footer
con copyright, layout de detalle de instancia con secciones expandidas
inline (Informações / Configurações de Webhook / Configurações
Avançadas / Zona de Perigo).

El rebuild vanilla de ADR 0019 quedó funcionalmente más capable (multi-
webhook, compositor multi-tipo, dominios nuevos) pero perdió ese look
porque el alcance original fue solo "paridad funcional core". El bundle
React previo era inmodificable (minificado sin fuentes), así que la
única salida era reescribir en vanilla — pero se hizo sin replicar el
shell del panel viejo.

Esta corrida recupera el look-and-feel **sin volver a React** (preserva
ADR 0019 — vanilla puro, sin Node ni build) y **sin tocar el backend**.

## Decisión

**Fase 1 (esta ADR)**: introducir un **shell común** (sidebar + topbar +
footer) que envuelve todas las vistas autenticadas. Vistas internas:
`dashboard` (placeholder) e `instances` (la lista actual, conservada
funcionalmente).

- `manager/dist/assets/js/core/shell.js` (nuevo): exporta
  `renderShell(root, activeKey, onNav)` que monta sidebar + topbar +
  main + footer y devuelve el `<main>` para que el caller appendée
  contenido. Patrón factorizado (regla de oro #2): cada vista no
  duplica chrome.
- `manager/dist/assets/js/features/dashboard-home/dashboardHomeView.js`
  (nuevo): vista placeholder "Dashboard".
- `manager/dist/assets/js/core/router.js`: `goDashboard()` redirigida a
  la home (placeholder) — `goInstances()` nuevo para la lista. El
  post-login (`main.js`, `loginView.js`) llama `goDashboard()` y por
  tanto cae en la home, coherente con el flow del look viejo.
- `manager/dist/assets/js/features/instances/dashboardView.js`:
  refactor para usar `renderShell` en vez de su propia topbar.
- `manager/dist/assets/css/app.css`: bloque CSS `.shell`/`.sidebar`/
  `.footer` + variables nuevas `--brand-emphasis` (#22c55e, verde más
  saturado para branding) + `--brand-emphasis-dim`. Mobile: sidebar
  colapsa a nav horizontal arriba con `grid-template-rows: auto 1fr`.
- `manager/dist/index.html`: title → "WebAPP-Wago".

Idioma base: **español** (clarificado por el usuario mid-corrida —
inicialmente se había puesto pt-BR siguiendo la screenshot vieja pero
luego pidió revertir).

**Fase 2 (corrida futura, fuera de scope)**: vista detalle de instancia
con `Informações da Instância` + `Configurações de Webhook` +
`Configurações Avançadas` + `Zona de Perigo` expandidos inline en una
página, reemplazando los modales actuales de Sesión (Conectar/QR/
Estado/Avanzado/Webhooks/Proxy). Los modales de Operar (Enviar/Grupos/
Contactos/etc.) quedan como están.

## Alternativas consideradas

- **Volver a React + Vite + Radix**: descartada. Contradice ADR 0019
  (mantenibilidad propia, sin build) y ADR 0018 (build Go con cache,
  sin Node). Inflar Dockerfile con Node multi-stage rompe los cache
  mounts del build de Go.
- **Replicar pixel-perfect el bundle React viejo**: descartada. El
  bundle minificado tenía clases auto-generadas (Radix + hash); replicar
  byte-exacto es trabajo sin valor. La paridad de "look-and-feel" es
  suficiente.
- **Hacer todo en una sola corrida** (Fase 1 + detalle inline): se
  ofreció al usuario. Para feedback temprano y reversibilidad, se optó
  por dividir.

## Consecuencias

- **Positivas**: look reconocible recuperado (sidebar, topbar con
  Swagger + Salir, footer con copyright, branding `WebAPP-Wago` verde
  emerald). Shell factorizado (vistas nuevas heredan automáticamente
  el chrome). Mobile responsive. Cero cambios en backend / lógica de
  negocio / contratos API.
- **Negativas**: la vista "Dashboard" es placeholder funcional —
  invita a una Fase 2/3 con métricas reales. La vista detalle de
  instancia sigue con modales (no inline expandido) — Fase 2 lo
  resuelve.
- **Neutras**: `goDashboard()` cambia semántica (antes apuntaba a la
  lista de instancias, ahora a la home). No rompe callers porque el
  flow post-login es el esperado por el usuario. Para "ir a la lista"
  ahora se usa `goInstances()`.

## Validación

- `node --check` sobre los 4 JS modificados: PASS.
- Render headless con Playwright + mock fetch:
  - Desktop dashboard: shell + sidebar + footer + h2 "Dashboard"
    presentes; sin errores en consola.
  - Desktop instancias: navegación por click en sidebar funciona,
    page-head muestra "Instancias" + botones "Actualizar" / "Nueva
    instancia"; empty state "Sin instancias todavía. Creá la primera.".
  - Mobile (390x844): sidebar colapsa a nav horizontal arriba sin gap
    vertical residual.
- Screenshots adjuntos a la corrida del Crisol.
