# RUN-LEDGER — El Crisol

## RUN webui-rebuild-001
STATUS: CLOSED
Branch: claude/await-instructions-aV6KL
Tier: completo
Alcance: rebuild total del panel (manager) vanilla no-build, paridad core
Planificador: contrato API extraído del backend Go (PASS)
Arquitecto: APPROVE — vanilla ES modules, core paridad, ES, marca neutra
Ingeniero: iter 1 monolito → REJECT (REGLA DE ORO #2) → refactor 17 módulos
Verificador: PASS — assets 200, node --check, contrato real e2e, render Chromium 0 errores
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-16 — commit b2c87ab

## RUN webui-restyle-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (rework visual: css + index.html + favicon)
Alcance: restyle del panel /manager con identidad del sitio institucional
  https://evolutionfoundation.com.br (confirmado por el usuario). Red
  desbloqueada esta sesión (curl 200).
Planificador: referencia real extraída del CSS del sitio (paleta/tipografía/
  layout); panel mapeado; paridad de clases JS↔CSS confirmada (PASS)
Arquitecto: APPROVE — CSS-only, dark-only, sin CDN (ADR 0019 offline-ok),
  contraste AA en verde neón; cero cambios de markup/JS
Ingeniero: app.css (tokens+componentes), index.html (color-scheme dark),
  favicon.svg (verde neón), ADR 0021 (tokens de diseño)
Verificador: PASS — render real Chromium 6 vistas (login/error/dashboard/
  crear/conectar/QR), 0 clases huérfanas, contratos intactos
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-16
