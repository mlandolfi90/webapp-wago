# 0058 - Bump deps frontend (Vite 5→7, Tailwind 3→4, TS 5.6→5.2)

- Estado: aceptado (retroactivo)
- Fecha: 2026-05-30
- Corrida Crisol: tech-debt-payoff-01 (regulariza un bump que se hizo
  sin ADR durante el rebase a evolution-manager-v2 fase A — auditoría
  detectó la violación de REGLA ORO #1)

## Contexto

ADR 0054 (stack frontend) declaró versiones congeladas:
- Vite 5.4.x
- Tailwind 3.4.x
- TypeScript 5.6.x
- React 18.3.x

Durante el rebase a `evolution-manager-v2-main` (corrida
`webui-rebase-on-evolution-01`, commit `a24c81a`), el `manager-src/`
fue reemplazado entero por el árbol del original — que venía con
`package.json` declarando:
- Vite **7.1.6**
- Tailwind **4.2.2** (con plugin `@tailwindcss/vite`)
- TypeScript **5.2.2**
- React 18.3.1 (sin cambio)

El bump efectivo de **2 majors Vite + 1 major Tailwind** se hizo sin
ADR, violando explícitamente la "REGLA ORO #1" (crédito técnico ante
cambios arquitectónicos) y la nota negativa de ADR 0054:
> "Cualquier upgrade mayor (React 19, Vite 6) requiere ADR nuevo".

Auditoría posterior (3 agentes paralelos) detectó el drift entre la
tabla de ADR 0054 y el `package.json` real. Esta ADR cierra ese
gap **retroactivamente**.

## Decisión

Reconocer el bump como aceptado. Razones:

1. **Heredado del rebase**: el código del original ya viene con estas
   versiones; revertir a 5.4/3.4 implicaría reescribir el
   `vite.config.ts` (el plugin `@tailwindcss/vite` solo existe en
   v4), las clases `field-sizing-content` de Tailwind 4 que se usan
   en `components/ui/textarea.tsx`, y el sistema de `@theme inline`
   con CSS vars en `src/index.css` (Tailwind 4 oxide engine, no
   compatible con la sintaxis v3).
2. **Sin breaking observado**: 3 corridas de Playwright (Dashboard
   KPIs, Pair-by-phone, Webhook multi) PASS contra el stack v4/v7.
   Build limpio en TS strict.
3. **Costo de revertir > costo de aceptar**. Revertir = ~3-5 corridas
   del Crisol grandes (refactor de Tailwind 4 a 3, ajuste de Vite
   plugins, ajustar el bundle output). El stack v4/v7 está soportado
   y estable (Vite 7 LTS, Tailwind 4 estable desde 2025).

## Versiones congeladas (actualiza ADR 0054)

| Capa | Paquete | Versión actual | Antes (ADR 0054) |
|---|---|---|---|
| Bundler | `vite` | `^7.1.6` | 5.4.x |
| Estilos | `tailwindcss` + `@tailwindcss/vite` | `^4.2.2` | 3.4.x |
| Lenguaje | `typescript` | `^5.2.2` | 5.6.x |
| UI runtime | `react`, `react-dom` | `^18.3.1` | 18.3.x ✓ |
| Routing | `react-router-dom` | `^6.25.1` | 6.27.x |
| Data | `@tanstack/react-query` | `^5.52.1` | 5.59.x |
| i18n | `i18next` + `react-i18next` | `^23.14.0` + `^15.0.1` | 23/15 ✓ |

## Alternativas consideradas

- **Revertir a 5.4/3.4**: descartada por costo (ver arriba).
- **Bump a Tailwind 5 (no estable)**: descartada por inmaduro.
- **Mantener ADR 0054 desactualizado**: descartada — viola REGLA ORO #1
  y confunde a futuras lecturas. Esta ADR resuelve el gap.

## Consecuencias

### Positivas

- Stack actual queda documentado y "congelado" de nuevo, pero a la
  versión correcta.
- Tailwind 4 trae `field-sizing-content`, `@theme inline`, oxide
  engine (build ~2x más rápido).
- Vite 7 con TLS support nativo + mejor tree-shaking de Radix.
- REGLA ORO #1 satisfecha retroactivamente.

### Negativas

- Marca el patrón "actualizar deps sin ADR previo, regularizar
  después" — aceptable solo cuando el bump viene de un rebase
  upstream documentado (este caso).
- Cualquier upgrade futuro a Vite 8 / Tailwind 5 requiere ADR
  **previo** (no retroactivo).

### Neutras

- ADR 0054 sigue válida en su parte **estructural** (carpetas,
  convenciones, alias `@/`, etc.). Solo la tabla de versiones
  queda subsumida por esta ADR.

## Validación

- `cd manager-src && npm run build` PASS sin errores ni warnings de
  deprecation.
- Suites Playwright (Dashboard, Webhook multi, Pair-by-phone): PASS
  acumulado del rebase.
- `npm audit`: 6 vulnerabilidades moderate, ninguna high/critical —
  ver `docs/notes/0011-security-debt-deferred.md` para tracking.
