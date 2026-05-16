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
STATUS: BLOCKED (pendiente de acceso de red)
Branch: claude/await-instructions-aV6KL
Tier: completo (rework visual: css + posible layout en vistas)
Alcance: restyle del panel tomando como referencia el estilo de Evolution
Bloqueo: egress allowlist del environment niega evolutionfoundation.com.br
  (403 "Host not in allowlist"); también browserbase.com (MCP hosteado
  inviable desde el sandbox). Verificado por curl/Chromium en sesión previa.
Desbloqueo requerido (acción del usuario, fuera del contenedor):
  agregar evolutionfoundation.com.br (+ www / *.evolutionfoundation.com.br)
  a la allowlist del environment, o usar política de red abierta, y
  abrir una sesión nueva sobre esta rama.
Pendiente confirmar: si la referencia visual es el sitio institucional o
  el Manager/dashboard de Evolution (URL distinta).
Próximo paso al desbloquear: Planificador/Arquitecto sobre la referencia
  visual real (render + capturas) → Ingeniero → Verificador con capturas.
Iteraciones: 0/3
