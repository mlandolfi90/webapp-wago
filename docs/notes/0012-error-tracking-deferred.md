# 0012 — Error tracking del panel (decisión: postergar, preferir GlitchTip)

Nota técnica que registra la decisión de **NO implementar** error
tracking del frontend ahora mismo, y la preferencia tecnológica para
cuando se priorice.

## Contexto

El panel React (`manager-src/`) puede crashearse en el navegador del
usuario por bugs JavaScript: `undefined.foo`, promises rechazadas sin
catch, componentes que tiran error en el render. Sin instrumentación,
**el operador no se entera** — el usuario ve pantalla en blanco, cierra
la pestaña, y nadie sabe que algo pasó.

Las opciones evaluadas:

- **Sentry SaaS** (sentry.io). Tier gratis 5k errores/mes, SDK ~30 KB,
  cuenta externa, datos pasan por servidores de Sentry.
- **GlitchTip self-hosted** (glitchtip.com). Clon open-source compatible
  con el SDK oficial de Sentry, gratis, datos quedan en infraestructura
  propia, requiere VPS para correrlo (Docker compose).
- **Solo logs del backend Go**. Captura errores del servidor pero NO
  los del browser.
- **No hacer nada**. Aceptar la ceguera a errores de frontend en prod.

## Decisión

1. **Postergar** la implementación hasta que se acumulen reportes de
   bugs en producción que no podemos reproducir localmente.
2. **Cuando se implemente, preferir GlitchTip self-hosted** sobre
   Sentry SaaS. Razones:
   - Datos del operador y los usuarios quedan en su propia
     infraestructura — coherente con el modelo self-hosted de
     webapp-wago en general.
   - Sin cuenta ni dependencia de un proveedor externo.
   - SDK es 100% compatible con `@sentry/react` → el código del
     instrumento es el mismo, solo cambia el DSN.
   - Costo: cero por el software; un container Docker + Postgres extra
     en la infra.

## Plan para cuando se priorice

1. Levantar GlitchTip en el `docker-compose.yml` del repo (o como
   container separado en el operador).
2. Crear proyecto "wago-panel" en GlitchTip → obtener DSN.
3. `npm install @sentry/react` en `manager-src/`.
4. Inicializar en `src/main.tsx`:
   ```ts
   import * as Sentry from "@sentry/react";
   if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
     Sentry.init({
       dsn: import.meta.env.VITE_SENTRY_DSN,
       tracesSampleRate: 0.1,
       replaysSessionSampleRate: 0,
       replaysOnErrorSampleRate: 1.0,
     });
   }
   ```
5. Wrap del router con `Sentry.withProfiler` para capturar errores de
   renders.
6. Variable `VITE_SENTRY_DSN` documentada en `.env.example` (opcional —
   sin DSN el SDK queda inerte y no impacta).

Costo estimado de la corrida del Crisol: ~1 hora (chico, sin cambios
de arquitectura).

## Triggers para reabrir esta decisión

- Más de 3 reportes de bug en producción que no se pueden reproducir
  localmente en un mes.
- Despliegue en escenarios multi-tenant donde la calidad de la UI es
  contractual.
- Solicitud explícita del operador.

Mientras tanto, el operador depende de:
- Logs del backend Go (errores de las llamadas API quedan registrados).
- Reportes manuales de los usuarios.
- Tests de Playwright de las corridas del Crisol (capturan regresiones
  conocidas pero no escenarios nuevos en producción).
