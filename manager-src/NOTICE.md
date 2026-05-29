# Atribución — manager-src/

Este panel React es un derivado de **Evolution Manager v2**, publicado por
Evolution Foundation bajo Apache License 2.0 con dos condiciones
adicionales del repositorio original.

- Proyecto original: https://github.com/EvolutionAPI/evolution-manager-v2
- Licencia base: Apache License 2.0 (texto en `/LICENSE` del repo raíz).
- Atribución cumplida en runtime: el footer del Shell muestra
  **"Powered by Evolution Manager"** con link clickable al repositorio
  original — ver `src/layouts/Shell.tsx`.

Modificaciones significativas realizadas por contribuidores de WebAPP-Wago:

- Reescritura del cliente API para hablar con el backend Go de WebAPP-Wago
  (no Evolution Node/Go).
- Adaptación del modelo de Webhook a multi-webhook con filtros embebidos
  por webhook (ADR 0045+ y siguientes).
- Rebrand de la marca primaria a "WebAPP-Wago" preservando el crédito
  visible "Powered by Evolution Manager" exigido por las condiciones del
  repo original.

Cualquier redistribución de este código fuente debe preservar este aviso y
el crédito en el footer del Shell. Ver el aviso `NOTICE` del repo raíz
para la atribución completa del producto.
