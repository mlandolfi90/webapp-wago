# 0054 - Stack del panel React + estructura de carpetas

- Estado: aceptado
- Fecha: 2026-05-29
- Corrida Crisol: webui-react-bootstrap-01 (tier completo)
- Depende de: ADR 0053

## Contexto

ADR 0053 reintroduce React como toolchain del panel. Falta congelar el
**stack concreto** y la **estructura de carpetas** para que las
corridas siguientes (Instances, InstanceConfig con N webhooks, Settings,
dominios menores) se agreguen sin discusión.

## Decisión

### Stack (versiones congeladas en `manager-src/package.json`)

| Capa | Paquete | Versión | Por qué |
|---|---|---|---|
| Bundler / dev server | `vite` | 5.4.x | Estándar React+TS. HMR rápido. |
| UI runtime | `react`, `react-dom` | 18.3.x | LTS estable. |
| Lenguaje | `typescript` | 5.6.x | Strict mode total. |
| Estilos | `tailwindcss` + `postcss` + `autoprefixer` | 3.4.x | Tokens vía CSS vars (theming). |
| Primitives | `@radix-ui/react-label`, `@radix-ui/react-slot` | 2.x / 1.x | Base accesible para shadcn. |
| Helpers UI | `class-variance-authority`, `clsx`, `tailwind-merge` | — | Patrón shadcn. |
| Iconos | `lucide-react` | 0.453.x | Único proveedor de íconos. |
| Routing | `react-router-dom` | 6.27.x | `basename: "/manager"`. |
| Data | `@tanstack/react-query` | 5.59.x | Cache + sync para llamadas al backend Go. |
| i18n | `i18next` + `react-i18next` + `i18next-browser-languagedetector` | 23/15/8 | es-ES (default) + pt-BR. |
| Toasts | `sonner` | 1.5.x | Liviano, accesible. |

**No agregar paquetes adicionales sin ADR.** El stack arriba cubre el
alcance proyectado de las corridas siguientes.

### Estructura de carpetas (`manager-src/`)

```
manager-src/
├── package.json            (deps + scripts)
├── vite.config.ts          (alias @/* + proxy dev al backend Go)
├── tsconfig.json           (strict; jsx react-jsx; baseUrl src)
├── tailwind.config.js      (darkMode 'class' + 'data-theme=dark')
├── postcss.config.js
├── components.json         (shadcn config)
├── index.html              (anti-flash de tema en <script>)
├── public/                 (favicon.svg)
├── NOTICE.md               (atribución a Evolution Manager v2)
└── src/
    ├── main.tsx            (mount + i18n + CSS)
    ├── App.tsx             (Theme + Query + Router + Toaster)
    ├── router.tsx          (createBrowserRouter, basename /manager)
    ├── index.css           (Tailwind + CSS vars de tema)
    ├── lib/
    │   ├── utils.ts        (cn = clsx + tailwind-merge)
    │   ├── api/
    │   │   ├── client.ts   (fetch wrapper; header apikey; envelope data)
    │   │   └── auth.ts     (validate + login + logout)
    │   ├── i18n/
    │   │   ├── index.ts
    │   │   └── locales/{es,pt}.json
    │   └── theme/
    │       └── theme-provider.tsx
    ├── components/ui/      (Radix-based primitives: button/card/input/...)
    ├── layouts/
    │   ├── Shell.tsx       (sidebar + header + footer + outlet)
    │   └── AuthGate.tsx    (redirect si no hay apikey)
    └── pages/
        ├── Login.tsx
        ├── Dashboard.tsx
        └── NotFound.tsx
```

### Convenciones (REGLA ORO #2 — código factorizado)

1. **Un componente por archivo.** Sin archivos cajón de sastre.
2. **Imports alias `@/`** desde `src/`. No paths relativos profundos.
3. **API client centralizado** en `lib/api/client.ts`. Las páginas y
   componentes NO usan `fetch` directo.
4. **Theming por CSS vars** en `:root` y `[data-theme='dark']`. El JS
   solo flippa el atributo; Tailwind y los componentes leen los tokens.
5. **i18n obligatorio** para todo string visible — incluso los del
   Shell. No strings hardcodeados en componentes.
6. **TanStack Query** para todo dato remoto (a partir de la corrida
   siguiente). El cliente fetch (`lib/api`) solo expone funciones; las
   páginas las envuelven en `useQuery`/`useMutation`.
7. **React Router con `basename: "/manager"`** — el backend Go sirve el
   SPA bajo ese prefijo. Cualquier link `<Link to="/foo">` se resuelve a
   `/manager/foo` automáticamente.

### Dockerfile (resumen del cambio; detalle en ADR 0053)

Stage Node `frontend-builder` antes del stage Go. Cache mount
`/root/.npm`. Output copiado al stage final en `/app/manager/dist`. Los
cache mounts Go (`/go/pkg/mod`, `/root/.cache/go-build`) permanecen
intactos — **no romper ADR 0018**.

### Makefile

- `make manager-deps` → `npm ci` en `manager-src/`.
- `make manager-build` → `vite build` + reemplaza `manager/dist/`.
- `make manager-dev` → `vite dev` con proxy a `:4000`.

## Alternativas consideradas

- **Vite 6.x**: descartada por ahora. Cambios de breaking menores
  innecesarios para el bootstrap.
- **React 19**: descartada. Aún no consolidado en el ecosistema Radix /
  TanStack Query. Re-evaluar en corrida futura.
- **shadcn CLI generando componentes**: descartada como dependencia.
  Mantenemos `components.json` por compatibilidad con `npx shadcn add`
  manual cuando convenga, pero los primitivos del bootstrap se escriben
  a mano (4 archivos chicos) para evitar dependencias de CLI durante el
  build.
- **CSS Modules + React puro (sin Tailwind)**: descartada. Más fricción
  para paridad pixel con el bundle original.
- **Zustand / Jotai para estado global**: descartada para el bootstrap.
  Theme provider local + TanStack Query alcanzan. Reabrir si una
  corrida futura lo necesita.

## Consecuencias

### Positivas
- Stack estable y de tamaño razonable.
- Factorización forzada por estructura (cada concept en su carpeta).
- TanStack Query lista para las corridas siguientes (lista de
  Instancias requiere cache + invalidation).
- Theming consistente con el vanilla actual (las CSS vars son el mismo
  esquema HSL → cero re-diseño visual).

### Negativas
- Cualquier upgrade mayor (React 19, Vite 6) requiere ADR nuevo.
- shadcn manual: si la corrida siguiente quiere `dialog`, `select` o
  `dropdown-menu`, hay que agregar el paquete `@radix-ui/react-*` y el
  componente al árbol `components/ui/`. Documentado en
  `docs/notes/0010-manager-react-stack.md`.

### Neutras
- Las corridas siguientes referencian este ADR cuando agreguen páginas
  o primitives. La estructura es la ley.
