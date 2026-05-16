# 0021 - Identidad visual del panel: tema Evolution Foundation

- Estado: aceptado
- Fecha: 2026-05-16
- Corrida Crisol: webui-restyle-001 (tier completo)

## Contexto y problema

El panel `/manager` (reescrito en ADR 0019 como vanilla JS sin build)
usaba una paleta genérica claro/oscuro con marca teal `#0f9d76`, sin una
identidad visual definida. Se pidió alinearlo con la estética del sitio
institucional de referencia (https://evolutionfoundation.com.br) para dar
coherencia de marca al producto.

## Decisión

Se adopta como identidad visual del panel un conjunto de **design tokens**
extraído de la referencia real (CSS del sitio institucional), aplicado de
forma **CSS-only** sobre `manager/dist/assets/css/app.css` sin tocar el
markup ni el JS (las clases ya son semánticas → paridad estructural).

Tokens canónicos (tema oscuro único):

- Fondos: `--bg #000000`, `--surface #0c111d`, `--surface-2 #111827`,
  `--surface-3 #101828`.
- Bordes: `--border #182230`, `--border-hi #233044`.
- Texto: `--text #e6e9f0`, `--muted #98a2b3`, `--muted-2 #667085`;
  headings en `#ffffff`.
- Acentos: `--brand #00ffa7` (verde neón, primario), `--gold #ffb800`,
  `--purple #8133aa`, `--danger #ff6b6b`.
- Detalle de marca: grid sutil de líneas + glow verde radial en el fondo;
  contenedor `--max 1140px`; tipografía display Poppins / cuerpo Inter.

Restricciones de diseño congeladas que se respetan:

- **Sin CDN / offline-ok** (ADR 0019): la tipografía usa font stack del
  sistema (`Inter, Poppins, ...` como nombres preferidos con fallback a
  `system-ui`); no se carga Google Fonts ni recursos externos.
- **Dark-only**: se elimina el `@media (prefers-color-scheme)` y el tema
  claro; la referencia es dark-only y un solo tema reduce superficie.
- **Contraste AA**: el verde neón es muy luminoso → botones/toasts
  primarios usan texto oscuro (`--brand-ink #04130d`), no blanco.

## Alternativas consideradas

- **Cargar Inter/Poppins desde Google Fonts**: descartada. Contradice la
  decisión congelada de ADR 0019 (offline-ok, sin CDN). El font stack del
  sistema rinde el mismo carácter cuando la fuente está instalada y
  degrada limpio si no.
- **Auto-hospedar las fuentes (woff2 en assets/)**: descartada por scope.
  Suma binarios al repo para una ganancia tipográfica marginal frente al
  stack del sistema; queda para una corrida futura si se requiere fidelidad
  tipográfica exacta.
- **Mantener tema claro+oscuro**: descartada. La referencia es dark-only;
  mantener dos temas duplica tokens sin alinear con la marca.
- **Reescribir markup/JS para nuevos componentes**: descartada (scope
  creep). Las clases existentes ya cubren el restyle vía CSS.

## Consecuencias

- Positivas: identidad de marca coherente con la referencia; cambio
  acotado a CSS + `index.html` + `favicon.svg` (cero riesgo funcional,
  paridad estructural total); Dockerfile/build intactos; offline-ok
  preservado; tokens reutilizables para futuras vistas.
- Negativas: tipografía dependiente de lo que el sistema del usuario
  tenga instalado (sin Inter/Poppins cae a `system-ui`); se pierde el
  tema claro.
- Neutras: el restyle es fiel en paleta/estructura, no un clon pixel a
  pixel del sitio institucional (que es una landing, no un panel).
