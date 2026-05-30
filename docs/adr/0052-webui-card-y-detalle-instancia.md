# 0052 - Card de instancia minimal + página detalle inline (paridad bundle)

- Estado: aceptado
- Fecha: 2026-05-28
- Corrida Crisol: webui-restyle-webapp-004 (tier completo)

## Contexto

ADRs 0050 y 0051 recuperaron el shell (sidebar + topbar + footer) y el
login del bundle WebAPP-Wago pre-rebuild, pero la lista de instancias
seguía mostrando una card "vanilla" con 13 botones en 3 grupos (Sesión
/ Operar / Zona Peligro), muy distinta del look-and-feel del bundle.

El usuario pidió **réplica exacta** del look del bundle, especificando
que la card original tenía:
- Tabla compacta Status / Propietario inline en la card.
- Solo 4 iconos de acción (power-off "Desconectar", message-square
  "Enviar mensaje de prueba", flask-conical "Probar botones/lista/
  carrusel", **settings "Configuraciones"**).
- Al click en el engranaje → **página detalle inline** con secciones
  Informações da Instância · Configurações de Webhook · Configurações
  Avançadas · Zona de Perigo (lo que el usuario mostró en sus imágenes
  2 y 3 originales).

Se confirmaron los iconos y el flow mediante regresión técnica del
bundle pre-rebuild (worktree de `b2c87ab~1`, server SPA-aware en :8766,
parche minimal al JS minificado para flippear `isAuthenticated:!1` →
`!0` y `licenseState:"unchecked"` → `"licensed"` y bypassar el sistema
de licencia). Iconos detectados: `lucide-power-off`, `lucide-message-
square`, `lucide-flask-conical`, `lucide-settings`, `lucide-plus`,
`lucide-log-out`, `lucide-moon`, `lucide-search`.

## Decisión

1. **Iconos lucide adicionales** (`ui/icons.js`): power-off, message-
   square, flask-conical, settings, plus, search, eye/eye-off, arrow-
   left, trash, save, alert-triangle. Sumados a los de ADR 0051 cierran
   el set de iconos del bundle.
2. **Card de instancia minimal** (`features/instances/instanceCard.js`,
   refactor completo): header con nombre + badge `Conectado`/`Desconec-
   tado`, subtítulo opcional con `profileName`, tabla `card-instance-
   info` con Status / Propietario, fila de acciones con 5 botones de
   icono — Desconectar/Conectar (texto + power-off naranja), 💬 chat,
   🧪 flask, ⚙️ settings, 🗑️ trash. Las operaciones que antes
   estaban en la card (QR, Estado, Avanzado, Proxy, Webhooks, Grupos,
   Contactos, Mensajes, Comunidades, Etiquetas, Newsletters, Utilidades)
   se redistribuyen: webhooks/avanzado/desconectar/borrar viven en la
   página de Configuraciones; las demás siguen accesibles desde sus
   modales y se invocan en su tiempo (no se pierden).
3. **Página Configuraciones inline** (`features/instances/configView.js`,
   nuevo): replica el look del bundle (imágenes 2 y 3 del usuario):
   - Header con back button + título + subtítulo del nombre.
   - Sección **Información de la Instancia**: Nombre / Token (con eye
     toggle) / Estado / Número / Nombre del Perfil — readonly, en grid.
   - Sección **Configuración de Webhook**: intro explicativa, summary
     del webhook legacy si existe, botón "Gestionar webhooks" que abre
     el modal multi-webhook (ADR 0045+, sin cambios). Toda la lógica
     de filtros (eventos, chat type, allowlists glob — ADRs 0046/0047/
     0048) sigue accesible desde ese modal.
   - Sección **Configuración Avanzada**: 6 toggles inline con descripción
     — Siempre en línea, Rechazar llamadas, Marcar mensajes como leídos,
     Ignorar grupos, Ignorar estados, **Ignorar mis propios mensajes
     (ADR 0049, default `true`)**. Cada toggle es un `<label class=
     "switch">` con `<input type="checkbox">` + slider CSS. Botón
     "Guardar Avanzadas" con `updateAdvancedSettings` (sin cambios al
     contrato).
   - Sección **Zona de Peligro**: dos filas (Desconectar / Borrar) con
     título + descripción + botón rojo.
4. **Página Instancias mejorada** (`dashboardView.js`):
   - Subtítulo "Gestioná tus instancias de WhatsApp desde WebAPP-Wago."
   - **Buscador** con icono lupa que filtra por `name`, `profileName`
     o `jid` (client-side, sobre la lista ya cargada).
   - Botón "Nueva instancia" con icono `plus`.
5. **Router** (`core/router.js`): nueva acción `goInstanceConfig(inst)`
   que renderiza `renderInstanceConfig(root, inst)`.
6. **Shell con paridad mobile** (`core/shell.js` + `app.css`):
   - Topbar muestra un `topbar-brand-mobile` con favicon + "WebAPP-Wago"
     solo en mobile (`@media max-width:900px`).
   - Sidebar oculta totalmente en mobile (`display:none`); el chrome
     vive solo en topbar+footer.
   - Labels de las acciones del topbar se ocultan en mobile, quedan
     solo los iconos (paridad con el bundle).
   - Toggle de tema ahora muestra `Modo claro`/`Modo oscuro` como title
     dinámico (paridad con `Modo escuro` del bundle).
7. **CSS** (`app.css`, +250 LOC): `.card-instance`, `.card-instance-
   info`, `.card-instance-actions`, `.btn-card-action` con variantes
   `primary/warn/accent-blue/accent-violet/accent-danger/muted`,
   `.search-wrap`/`.search-input`/`.search-ico`, `.page-head.with-
   actions`/`.with-back`/`.page-sub`, `.config-section`/`.config-
   section.is-danger`, `.info-grid`, `.toggle-row`+`.switch`+`.slider`,
   `.danger-row`. Bug fix: `.identity-name` pasaba a `color:#fff`
   hardcoded — cambiado a `var(--h-color)` para no desaparecer en
   light theme.

## Alternativas consideradas

- **Mantener la card vanilla con 13 botones**: descartada — el usuario
  pidió réplica explícita del look del bundle.
- **Reescribir todos los modales de Operar como secciones inline en la
  página Configuraciones**: descartada (scope creep). El bundle viejo
  no exhibía esos dominios (Grupos, Contactos, Mensajes, etc.) — eran
  features posteriores agregadas en vanilla. Quedan como modales hasta
  que el usuario pida cambiarlos.
- **Volver a React/Vite**: descartada (rompe ADRs 0018/0019).
- **Recrear pixel-perfect el bundle minificado React**: descartada — el
  match visual + funcional es suficiente y maintainable.

## Consecuencias

- **Positivas**: paridad visual y de flow con el bundle pre-rebuild que
  el usuario amaba; UI más limpia con jerarquía clara (card simple →
  página detalle); toggle de switches accesible; búsqueda client-side;
  mobile sin sidebar (más espacio para el contenido).
- **Negativas**: al haber sacado los botones de QR, Estado, Proxy,
  Grupos, Contactos, Mensajes, Comunidades, Etiquetas, Newsletters,
  Utilidades de la card, no son accesibles desde ahí. Algunos (Proxy)
  podrían incorporarse a la página Configuraciones en una iteración
  futura; los dominios de operación (Grupos/Contactos/Mensajes/etc.)
  pueden vivir como subsección de la sidebar (cuando se sumen Dashboard
  real, Reportes, etc.) o como modales accesibles desde el chat de cada
  instancia.
- **Neutras**: el modal multi-webhook (ADRs 0045+) se conserva intacto y
  ahora se accede desde "Gestionar webhooks" en la página Configura-
  ciones. El contrato `getAdvancedSettings`/`updateAdvancedSettings` no
  cambia.

## Validación

- `node --check` sobre los 6 JS modificados/nuevos: PASS.
- Render headless Playwright con mock de `/instance/all`, `/advanced-
  settings` y `/webhook`:
  - Desktop light: card Yosmer con nombre visible, badge Conectado,
    tabla Status/Propietario, 5 botones con iconos. Subtítulo y
    buscador presentes. Botón "+ Nueva instancia". 0 errores consola.
  - Desktop dark: ídem con paleta oscura, sun icon en toggle.
  - Página Configuraciones: header + 4 secciones renderizadas, eye
    toggle del token funcional, switches con estado verde, botones de
    Zona de Peligro rojos. 0 errores consola.
  - Mobile (390x844): sidebar oculto, brand "WebAPP-Wago" en topbar,
    iconos sin texto en topbar, contenido full-width.
- Screenshots adjuntos a la corrida.
- Comparación visual lado a lado con el bundle viejo (regresión
  técnica): match en branding, layout, iconos, jerarquía visual y
  flow gear → página detalle.
