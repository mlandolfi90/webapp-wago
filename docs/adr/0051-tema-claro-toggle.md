# 0051 - Tema claro con toggle + topbar completo (API Tester, iconos)

- Estado: aceptado
- Fecha: 2026-05-28
- Corrida Crisol: webui-restyle-webapp-002 (tier completo)

## Contexto

Continuación de ADR 0050 (shell WebAPP-Wago). El usuario confirmó que el
look que quiere es el del dashboard pre-rebuild (imagen de referencia):
branding WebAPP-Wago verde, sidebar con iconos, y un **topbar completo**
con `API Tester` · `Swagger` · **toggle de tema (🌙/☀️)** · `Salir`.

Dos brechas con ADR 0050:
1. El topbar de Fase 1 solo tenía `Swagger` + `Salir`, sin iconos, sin
   API Tester, sin toggle de tema.
2. El panel era **dark-only** por decisión de ADR 0021. El diseño que el
   usuario quiere incluye un toggle de tema claro/oscuro funcional
   (elegido explícitamente por el usuario sobre las alternativas "omitir"
   y "icono decorativo").

La vista de detalle inline (otra referencia que circuló) se descartó: el
usuario aclaró que su UX real eran "las instancias con varios botones
como config" — i.e. las cards con botones actuales, que se conservan.

## Decisión

1. **Tema claro funcional con toggle** — revierte el "dark-only" de ADR
   0021 (que por lo demás sigue vigente en su paleta y tipografía).
   - `core/theme.js` (nuevo): `getTheme`/`setTheme`/`toggleTheme`/
     `applyTheme`. Preferencia en `localStorage["wago.theme"]`.
   - `app.css`: los tokens de `:root` pasan a `:root, :root[data-theme=
     "dark"]`; nuevo bloque `:root[data-theme="light"]` con override de
     todos los tokens de color (incl. `--grid-line`, `--shadow`,
     `--glow`, y el verde de marca a `#16a34a` para contraste AA sobre
     fondos claros). Variable `--h-color` reemplaza el `#fff` hardcodeado
     de headings; topbar/sidebar/footer pasan de `rgba(8,12,20,…)` a
     `var(--surface)` para ser theme-aware.
   - `index.html`: script inline anti-flash que aplica el tema guardado
     antes del primer render (evita FOUC).
   - `main.js`: `applyTheme(getTheme())` en el boot.
2. **Topbar completo con iconos** (`core/shell.js` + `ui/icons.js`
   nuevo): `API Tester` y `Swagger` (ambos → `/swagger/index.html`,
   porque el backend no expone una ruta de API Tester separada —
   confirmado por el usuario), toggle de tema (icono luna/sol que refleja
   el estado actual), `Salir`. Iconos SVG inline stroke=currentColor (sin
   CDN, ADR 0019).
3. **Sidebar con iconos** SVG (grilla para Dashboard, dispositivo para
   Instancias) en vez de los glifos unicode crudos de ADR 0050.

## Alternativas consideradas

- **Mantener dark-only** (omitir el toggle): descartada por pedido
  explícito del usuario.
- **Icono de tema decorativo sin función**: descartada — el usuario
  quiere el toggle funcional.
- **API Tester como ruta propia**: descartada — el backend solo sirve
  `/swagger` y `/manager`; agregar una ruta nueva era scope creep. Se
  apunta a Swagger (que cumple la función de probar la API).
- **Página de detalle de instancia inline**: descartada — el usuario
  aclaró que su UX real eran cards con botones (las actuales).

## Consecuencias

- **Positivas**: paridad con el dashboard de referencia (topbar completo
  + iconos + branding). Tema claro accesible (verde `#16a34a` AA sobre
  blanco) con persistencia y sin flash. Iconos SVG nítidos, sin
  dependencias. Cards de instancia intactas.
- **Negativas**: el tema claro suma superficie de CSS a mantener (todo
  token nuevo de color debe definirse en ambos temas). Documentado acá
  para que futuras corridas no rompan el contrato de doble tema.
- **Neutras**: ADR 0021 deja de ser "dark-only" pero su paleta dark sigue
  siendo el default. `API Tester` y `Swagger` apuntan al mismo destino
  hasta que exista (si existe) una ruta de tester dedicada.

## Validación

- `node --check` sobre los JS nuevos/modificados: PASS.
- Render headless Playwright + mock fetch:
  - Topbar: 4 acciones (`API Tester`, `Swagger`, toggle, `Salir`) con 4
    SVG; sidebar con 2 SVG.
  - Toggle: `data-theme` pasa a `light` al click; screenshot dark y light
    del dashboard + instancias correctos en ambos.
  - Persistencia: tras `reload()` el tema sigue en `light` (anti-flash
    del script inline funciona).
  - 0 errores de consola.
- Screenshots adjuntos a la corrida.
