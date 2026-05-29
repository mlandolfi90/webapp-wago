# 0010 — Manager React stack: cómo trabajar

Nota técnica acompañando los **ADR 0053** (reversal de vanilla a React)
y **0054** (stack concreto). Acá va el "cómo se opera"; ahí va el
"por qué se eligió".

## Setup local (primera vez)

```bash
make manager-deps          # npm ci dentro de manager-src/
```

Necesitás Node 22 + npm 10. El Dockerfile usa `node:22-alpine`; mantener
la misma major version para evitar diferencias de lockfile.

## Dev loop

Dos terminales:

```bash
# Terminal 1 — backend Go
make dev                   # corre el server Go en :4000

# Terminal 2 — frontend React con HMR
make manager-dev           # vite en :5173, proxy a :4000
```

Abrir `http://localhost:5173/manager/` — el `basename: "/manager"` de
react-router coincide con el prefijo donde el backend Go sirve el SPA en
producción, así no hay sorpresas de URL al deployar.

El proxy del `vite.config.ts` redirige `/(instance|webhook|chat|...)/...`
al backend Go en `:4000`. Si agregás un dominio nuevo (e.g. `/billing`),
sumalo a la alternation del proxy.

## Build de producción

```bash
make manager-build         # vite build → reemplaza manager/dist/
```

El comando ejecuta `npm run build` (que corre `tsc -b` + `vite build`)
y copia `manager-src/dist/` sobre `manager/dist/`. Después podés
ejecutar `make build` + `./build/webapp-wago` localmente y va a servir
el SPA React desde `/manager`.

## Build Docker (sin tocar nada local)

```bash
make docker-build
```

El Dockerfile tiene 3 stages:

1. `frontend-builder` (node:22-alpine) → `npm ci && npm run build` →
   `/build-fe/dist/`
2. `build` (golang:1.25-alpine) → `go build` con los cache mounts Go
3. `final` (alpine:3.19) → copia `server`, `wago-mcp` y el SPA del stage
   1 a `/app/manager/dist/`

Los cache mounts (`/root/.npm` para Node, `/go/pkg/mod` +
`/root/.cache/go-build` para Go) se preservan entre builds vía el
builder buildx persistente (`make buildx-setup` + `BUILDX_BUILDER`).

## Agregar una página nueva

1. Crear `manager-src/src/pages/MiPagina.tsx`.
2. Registrar la ruta en `manager-src/src/router.tsx` dentro del bloque
   protegido por `<AuthGate>` + `<Shell>`.
3. Agregar la entrada al sidebar en `manager-src/src/layouts/Shell.tsx`
   (array `navItems`).
4. Strings → `manager-src/src/lib/i18n/locales/{es,pt}.json`.
5. Llamadas al backend → funciones en `manager-src/src/lib/api/<dominio>.ts`,
   envueltas en `useQuery`/`useMutation` desde la página.

## Agregar un componente Radix nuevo (e.g. Dialog)

1. `cd manager-src && npm install @radix-ui/react-dialog`
2. Crear `manager-src/src/components/ui/dialog.tsx` usando el patrón
   shadcn (Slot + cva + cn). Referencia: cualquier componente shadcn
   público para Dialog — ver `components.json` para alias.
3. Re-export desde la página que lo usa.

**No usar la CLI de shadcn** durante el build (genera archivos en runtime).
Para evitar fricción: copiar el archivo a mano. El `components.json`
está sólo para que el linter sepa los alias.

## Theming (dark/light)

CSS vars en `src/index.css`:
- `:root, [data-theme='light']` = paleta clara
- `[data-theme='dark']` = paleta oscura

`<ThemeProvider>` (en `lib/theme/`) flippa el atributo + `class="dark"`
en `<html>` y persiste en `localStorage` con key `wago.theme`. El
`<script>` inline del `index.html` aplica el tema **antes** del primer
render para evitar el flash blanco al cargar.

Para agregar un color nuevo:
1. Agregar la var CSS en ambas paletas.
2. Mapearla en `tailwind.config.js → theme.extend.colors`.
3. Usar como `text-mi-color` / `bg-mi-color` desde Tailwind.

## i18n

- Default: `es`. Detecta `localStorage.wago.lang` y, si falta,
  `navigator.language`.
- Para cambiar idioma manualmente desde la app:
  `i18n.changeLanguage('pt')`.
- Las claves se agregan en ambos JSONs (`es.json` y `pt.json`). El
  fallback es `es` — si una clave falta en pt, se muestra la española.

## API client

Todo va por `lib/api/client.ts`:

```ts
import { request } from '@/lib/api/client'

const instances = await request<Instance[]>('/instance/all')
```

- Header `apikey` se inyecta automáticamente desde `localStorage`.
- Envelope `{message, data}` del backend Go se desempaqueta solo (devuelve
  `data` directo).
- Errores tiran `ApiError` con `status` para que el caller diferencie
  401/403 (invalidar key) de 5xx (mostrar toast).

## Atribución legal (Apache 2.0)

El código del panel deriva de `evolution-manager-v2` (Apache 2.0 con 2
condiciones del repo original). Cumplimos:

1. `manager-src/NOTICE.md` documenta el origen y las modificaciones.
2. El footer del Shell y el subtítulo del Login muestran "Powered by
   Evolution Manager" con link al repo original.

**No retirar el aviso del footer/login.** Si rediseñás el Shell o el
Login, mantené el crédito visible — está exigido por las condiciones
del repo original y forma parte del acuerdo de uso.
