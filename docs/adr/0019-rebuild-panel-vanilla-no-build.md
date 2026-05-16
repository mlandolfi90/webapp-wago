# 0019 - Rebuild del panel (manager) en vanilla JS sin build

- Estado: aceptado
- Fecha: 2026-05-16
- Corrida Crisol: webui-rebuild-001 (tier completo)

## Contexto y problema

El panel `/manager` se distribuía solo como bundle compilado en
`manager/dist` (React + Vite + Radix), **sin código fuente en el repo** y
sin source maps. Eso impedía mantenerlo, rebrandearlo o evolucionarlo, y
dejaba restos de marca "evolution" hardcodeados. Se requiere un panel
mantenible y rebrandeable con paridad funcional sobre la API Go existente.

## Decisión

Se reescribe el panel como aplicación **vanilla JS sin toolchain de build**,
servida tal cual desde `manager/dist/` (`index.html` + `assets/app.js` +
`assets/app.css` + `assets/favicon.svg`). El frontend consume el contrato
real del backend Go (header `apikey`; admin = `GLOBAL_API_KEY`, instancia =
token; envelope `{message,data}`/`{error}`; WS `/ws?token&instanceId`).
Alcance: paridad core (login, instancias CRUD, conexión+QR, estado,
webhook+eventos, proxy, advanced-settings, envío de prueba, link a Swagger).
Idioma español, identidad neutra "Wago".

## Alternativas consideradas

- **React + Vite + TS + Node multi-stage en el Dockerfile**: descartada.
  Contradice la decisión congelada del repo de no inflar el build (ADR
  0018 / `CLAUDE.md`: build Go con caché, sin Node). Sumaría toolchain,
  deps y minutos de build para un panel de control pequeño.
- **Parchear el bundle minificado existente**: descartada. Frágil, no
  mantenible, no elimina la dependencia de fuente ausente.
- **Ingeniería inversa del bundle a fuente**: descartada como entregable
  (sin source maps el resultado es código sintético); se usó solo como
  extractor de spec read-only.

## Consecuencias

- Positivas: código fuente propio, mantenible y rebrandeable; Dockerfile
  intacto (preserva los cache mounts del build Go); sin CDN, offline-ok;
  elimina restos "evolution".
- Negativas: sin framework ni DX moderna (hot reload, componentes); el
  alcance se limita al panel core (las familias API extra quedan para
  futuras corridas del Crisol, fuera de scope por "cero scope creep").
- Neutras: paridad acotada a lo que el panel original exponía, no a las
  ~80 rutas de la API.
