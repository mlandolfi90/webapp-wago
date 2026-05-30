# manager/dist/

Este directorio **NO se versiona**. Se genera en cada build:

- `make manager-build` → `vite build` en `manager-src/` → copia el output acá.
- `make docker-build` → el stage `frontend-builder` del Dockerfile lo genera dentro de la imagen y lo copia a `/app/manager/dist/`.

El servidor Go sirve los archivos estáticos de este directorio desde `/manager` (ver `pkg/routes/routes.go::managerHandler`).

Si `go run` local sirve 404 en `/manager`, ejecutá `make manager-deps && make manager-build` primero.

Ver ADR 0053 (reversal del rebuild vanilla a React+Vite+Radix) y ADR 0054 (stack frontend).
