# 0053 - Revertir el panel vanilla a React + Vite + Radix

- Estado: aceptado
- Fecha: 2026-05-29
- Corrida Crisol: webui-react-bootstrap-01 (tier completo)
- Reemplaza: ADR 0019 (rebuild vanilla sin build)

## Contexto y problema

ADR 0019 reemplazó el bundle React minificado del panel `manager/` por una
implementación vanilla JS sin toolchain de build. La decisión fue válida
en su momento porque el bundle original era inmodificable (sin fuentes,
sin source maps) y se necesitaba mantenibilidad inmediata.

Tras 8 corridas del Crisol (0019 → 0052) sobre el vanilla, llegamos al
límite del enfoque para el alcance proyectado:

1. **Restauración del look "WebAPP-Wago" (ADR 0050)**, **toggle de tema
   (0051)** y **paridad de card+detalle con el bundle (0052)** requirieron
   replicar a mano sistemas que en React/Radix vienen gratis (componentes
   compuestos, theming por CSS vars con tokens, animaciones controladas).
2. La extensión proyectada del modelo Webhook (corrida 3) suma N webhooks
   con transports embebidos (RabbitMQ/WebSocket/NATS) **por webhook**. La
   complejidad de la UI sale del rango cómodo del vanilla actual.
3. El usuario consiguió las fuentes originales del panel
   (`evolution-manager-v2`), lo que elimina el motivo que justificó ADR
   0019 (fuente ausente). Ahora podemos partir de un stack moderno con
   paridad pixel del look original.

## Decisión

Se **revierte ADR 0019**. El panel pasa a ser una aplicación React+Vite
+Radix+Tailwind nueva, vivida en `manager-src/`, que compila a
`manager/dist/` consumida por el binario Go vía el handler estático
existente (`/manager`).

- Toolchain: Node 22 + Vite 5 + React 18 + TypeScript 5 + Tailwind 3
  + Radix primitives + TanStack Query + react-router 6 + i18next.
- Build: stage Node `frontend-builder` en el Dockerfile, anterior al
  stage Go. **Preserva los cache mounts Go de ADR 0018** (no los toca);
  agrega `--mount=type=cache,target=/root/.npm` para el cache de npm.
- Output: el stage final del Dockerfile copia `frontend-builder:/build-fe
  /dist` a `/app/manager/dist`. Local: `make manager-build` reemplaza
  `manager/dist` con el output de Vite.
- Atribución: el código está basado en `evolution-manager-v2` (Apache
  2.0 + 2 condiciones del repo original). Se cumple el aviso en runtime
  mostrando "Powered by Evolution Manager" en el footer del Shell y en
  el subtítulo del Login con link al repo original. Atribución
  documentada en `manager-src/NOTICE.md`. La marca primaria del producto
  sigue siendo "WebAPP-Wago" (compatible con la atribución exigida).

Esta corrida (`webui-react-bootstrap-01`) entrega únicamente el
bootstrap: setup, Shell, Login y Dashboard placeholder. Las páginas de
Instances, InstanceConfig (con el nuevo modelo de N webhooks embebidos),
Settings y dominios menores quedan para corridas siguientes, sin scope
creep.

## Alternativas consideradas

- **Seguir extendiendo el vanilla**: descartada. El esfuerzo de mantener
  paridad visual con React/Radix y soportar el nuevo modelo de Webhook
  se vuelve negativo vs. usar el framework directamente.
- **Migrar incremental (mitad React, mitad vanilla)**: descartada. Dos
  modelos de render conviviendo + dos build pipelines + dos sistemas de
  estado = peor que ambos extremos.
- **React sin Tailwind/Radix (solo Vite + React puro)**: descartada. La
  paridad pixel con el bundle original requiere el sistema de
  composición y theming de Radix+Tailwind. Reescribir esos primitivos
  cae en el mismo problema que el vanilla.
- **Pagar licencia comercial a Evolution Foundation** para evitar la
  atribución: descartada por costo desconocido y porque la atribución
  no compromete el rebrand "WebAPP-Wago".

## Consecuencias

### Positivas
- DX moderna: HMR, componentes, theming declarativo, type-checking.
- Paridad pixel con el bundle original alcanzable de forma sostenible.
- Extensión del modelo Webhook (corrida 3) se desbloquea con UI compleja
  sin reinventar primitivos.
- El derivado preserva el crédito Apache 2.0 al proyecto original (legal
  limpio).

### Negativas
- Sumamos Node (~150 MB en el build context, ~30 s de cold cache) al
  pipeline. Mitigado con cache mount npm + buildx persistente.
- Perdemos el "offline-ok, sin Node" de ADR 0019. Aceptado a cambio de
  los positivos.
- Los hábitos de las corridas 0050/0051/0052 (escribir HTML/CSS a mano)
  cambian. La curva la asume el equipo de mantenimiento.

### Neutras
- `manager/dist/` queda gobernado por el output de Vite. Hasta la
  primera ejecución de `make manager-build` o `make docker-build`, el
  vanilla actual sigue en su lugar — transición sin disrupción.
- ADR 0019 queda **reemplazado** por este. Las decisiones derivadas de
  0019 (0050/0051/0052) están **superseded en alcance** pero su intent
  visual (look "WebAPP-Wago" verde brillante, sidebar+topbar+footer,
  toggle de tema) se re-implementa en React desde el bootstrap.

## Validación

- Verificador binario de la corrida: ver entrada
  `webui-react-bootstrap-01` en `docs/adr/RUN-LEDGER.md`.
- `npm run build` produce `manager-src/dist/index.html` con `<div
  id="root">` y assets hasheados.
- `docker build` con el nuevo Dockerfile produce imagen que sirve el SPA
  React en `/manager/`.
- Footer del Shell y subtítulo del Login muestran "Powered by Evolution
  Manager" con link clickable al repo original.
