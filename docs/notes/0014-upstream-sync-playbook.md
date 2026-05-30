# 0014 — Playbook de sincronización con upstreams

Procedimiento para integrar actualizaciones de los 3 proyectos
upstream de los que vive `webapp-wago`:

| Upstream | Qué provee | Vive en wago como |
|---|---|---|
| `tulir/whatsmeow` | Driver oficial del protocolo WhatsApp | Submódulo `whatsmeow-lib/` (vía fork propio, ADR 0042) |
| `EvolutionAPI/whatsmeow` | Fork con parches de Evolution | Source remoto del submódulo |
| `EvolutionAPI/evolution-go` | Backend Go del que deriva wago (NOTICE) | Código en `pkg/` y `cmd/` |
| `EvolutionAPI/evolution-manager-v2` | Panel React del que deriva el panel | Código en `manager-src/` (ADR 0053) |

Complementa **ADR 0036** (estrategia upstreaming) y **ADR 0042**
(submódulo). Este doc es **el cómo operativo**.

## Inventario de patches propios — WAGO-PATCH markers

Cada cambio nuestro al código upstream lleva un marker `WAGO-PATCH(ADR-XXXX)`
para identificarlo al mergear. Al sincronizar, los conflictos en estas
líneas son **esperados** — re-aplicar el patch del lado wago.

Inventario al **2026-05-30**:

| Marker | Qué patcha | Archivos |
|---|---|---|
| `ADR-0049` | IgnoreFromMe per-instance + per-webhook | `pkg/{instance,webhook}/{model,service}`, `pkg/whatsmeow/service/whatsmeow.go` |
| `ADR-0055` | Webhook transports per-webhook (RMQ/WS/NATS) | `pkg/webhook/{model,service}`, `cmd/webapp-wago/main.go` |
| `ADR-0057` | Status.Connected = IsLoggedIn + Pair nil-safe | `pkg/instance/service/instance_service.go` |
| `ADR-0059` | SSRF guards en album + webhook URL | `pkg/sendMessage/service/album.go`, `pkg/webhook/service/webhook_service.go` |

Comando rápido para inventario actualizado:

```bash
grep -rn "WAGO-PATCH(" pkg/ cmd/ | awk -F'WAGO-PATCH\\(' '{print $2}' | awk -F')' '{print $1}' | sort -u
```

---

## 1. Sincronizar `whatsmeow-lib` (submódulo)

### Cuándo

- Bug del driver protocolo (mensajes que no llegan, decryption errors)
- Nuevas features del WhatsApp (botones, polls, comunidades)
- Cada 2-4 semanas como mantenimiento preventivo

### Procedimiento

```bash
# 1. Entrar al submódulo
cd whatsmeow-lib

# 2. Asegurarse que los remotes están configurados (una vez)
git remote -v
# Esperado:
#   origin       https://github.com/mlandolfi90/whatsmeow.git (fetch/push)
#   tulir        https://github.com/tulir/whatsmeow.git (fetch/push)
#   evolutionapi https://github.com/EvolutionAPI/whatsmeow.git (fetch/push)
# Si faltan:
#   git remote add tulir https://github.com/tulir/whatsmeow.git
#   git remote add evolutionapi https://github.com/EvolutionAPI/whatsmeow.git

# 3. Ver qué hay de nuevo
git fetch tulir
git fetch evolutionapi
git log --oneline HEAD..tulir/main | head -20
git log --oneline HEAD..evolutionapi/main | head -20

# 4. Decidir qué traer (típicamente lo de EvolutionAPI que ya integra tulir)
# Si querés solo lo de tulir (más conservador):
git checkout wago-patches
git merge tulir/main
# Si querés lo de Evolution (más rápido, ya integrado):
git merge evolutionapi/main

# 5. Resolver conflictos
# Conflictos típicos en archivos: types/*, message.go, send.go
# NO hay WAGO-PATCH markers acá (no patcheamos whatsmeow directo en wago);
# si los hubiera, re-aplicar siguiendo el ADR que indica el marker.

# 6. Push del fork
git push origin wago-patches

# 7. Volver al repo principal y actualizar el pointer del submódulo
cd ..
git add whatsmeow-lib
git status   # debería decir "modified: whatsmeow-lib (new commits)"
```

### Verificación post-merge

```bash
make deps               # download go.mod
go build ./...          # PASS
go vet ./...            # PASS
go test ./... -count=1  # PASS
go test -race ./pkg/whatsmeow/... -count=1  # opcional pero recomendado
make docker-build       # build entero
```

### Commit

```bash
git commit -m "chore(whatsmeow): bump submódulo a <SHA-corto> (<descripción upstream>)

Trae de <tulir|evolutionapi>:
- <feature/fix relevante 1>
- <feature/fix relevante 2>

Verificación: go build + vet + test PASS. Sin conflictos con
WAGO-PATCH markers (no patcheamos whatsmeow directo)."
```

---

## 2. Sincronizar `evolution-go` (backend)

### Cuándo

- Nuevos endpoints upstream (e.g. soporte de comunidades, newsletters)
- Bugs upstream que afectan nuestros usuarios (e.g. memory leak)
- **NO** para cambios cosméticos o de branding (eso ya divergimos)

### Procedimiento

```bash
# 1. Setup del remote upstream (una vez)
git remote add upstream-evo https://github.com/EvolutionAPI/evolution-go.git
git fetch upstream-evo

# 2. Ver qué hay de nuevo
git log --oneline HEAD..upstream-evo/main -- pkg/ cmd/ | head -30

# 3. Crear branch dedicada (NO mergear directo a main)
git checkout -b chore/upstream-evo-sync-$(date +%Y%m%d)

# 4. Cherry-pick o merge según volumen
# Volumen chico (5-10 commits cohesivos): cherry-pick
git cherry-pick <SHA1> <SHA2> ...

# Volumen grande: merge --no-commit para revisar antes
git merge upstream-evo/main --no-commit --no-ff

# 5. RESOLVER CONFLICTOS — los más probables son en:
#   pkg/instance/model/instance_model.go       (WAGO-PATCH ADR-0049 IgnoreFromMe)
#   pkg/instance/service/instance_service.go   (WAGO-PATCH ADR-0057 Status+Pair)
#   pkg/webhook/                               (ADR-0049 + 0055 — todo este package es wago-specific)
#   pkg/sendMessage/service/album.go           (WAGO-PATCH ADR-0059 SSRF guard)
#   cmd/webapp-wago/main.go                    (WAGO-PATCH ADR-0055 SetTransports)
#
# Para cada conflicto:
#   a. Aceptar el cambio upstream
#   b. RE-APLICAR el patch wago siguiendo el ADR del marker
#   c. Verificar que el marker WAGO-PATCH(ADR-XXXX) sigue presente

# 6. Verificar
go build ./...
go vet ./...
go test ./... -count=1
go test -race ./pkg/webhook/... -count=1

# 7. Commit + push de la branch + abrir PR para revisión
git commit  # mensaje detallado: qué se trajo + qué patches se re-aplicaron
git push -u origin chore/upstream-evo-sync-$(date +%Y%m%d)
```

### Cuándo abrir ADR nueva post-merge

- Si el upstream **cambió un endpoint que nosotros ya patcheamos** → ADR
  nueva que documente la convergencia/divergencia.
- Si trae una **feature wago-incompatible** (e.g. cambia el shape del
  Webhook model rompiendo ADR 0055) → ADR de decisión: ¿adoptar y
  retirar nuestro patch, o seguir divergiendo?
- Para bugs/fixes triviales: NO se necesita ADR.

---

## 3. Sincronizar `evolution-manager-v2` (panel frontend)

### Cuándo

- Mejoras de UX upstream (componentes Radix nuevos, theming)
- Bugs del panel (issues abiertos en el repo upstream)
- Nuevas páginas que sí aplicarían a wago (Settings extra, etc.)

### NUNCA

- **NO** traer páginas de integraciones que ya descartamos: Chat,
  Chatwoot, Dify, Evoai, EvolutionBot, Flowise, N8n, Openai, Typebot,
  Sqs, EmbedChat, LicenseCallback. Ver ADR 0053 — esas páginas
  apuntan a Evolution Node que NO existe en backend wago.

### Procedimiento

```bash
# 1. Clone del upstream a un dir temporal (NO como remote del repo
#    porque la historia divergió mucho; manejamos diffs manuales)
git clone https://github.com/EvolutionAPI/evolution-manager-v2 /tmp/evmgr-fresh
cd /tmp/evmgr-fresh

# 2. Ver qué cambió desde el último sync (usá la fecha del último merge
#    documentado en docs/adr/RUN-LEDGER.md corrida webui-rebase-on-evolution-*)
git log --since=2026-05-30 --oneline -- src/

# 3. Identificar archivos relevantes para wago:
#    INCLUIR cambios en:
#      - src/components/ui/* (primitives shadcn)
#      - src/components/{base-header,header,footer,sidebar,instance-*,theme-provider}.tsx
#      - src/layout/{MainLayout,InstanceLayout}.tsx
#      - src/contexts/InstanceContext.tsx
#      - src/lib/queries/{api.ts,react-query.ts,token.ts,types.ts,mutateQuery.tsx}
#      - src/lib/queries/{auth,instance,proxy,webhook,go}/*  (cuidado con webhook/ — wago usa multiWebhook)
#      - src/lib/utils.ts, src/index.css, src/main.tsx (con cuidado)
#      - src/pages/{Login,Dashboard}/index.tsx
#      - src/pages/instance/{DashboardInstance,Proxy,Settings}/index.tsx
#    EXCLUIR cambios en:
#      - src/pages/instance/{Chat,Chatwoot,Dify,Evoai,EvolutionBot,Flowise,N8n,Openai,Typebot,Sqs}/
#      - src/pages/instance/{Websocket,Rabbitmq}/        (eliminadas, endpoints inexistentes en wago)
#      - src/pages/Home.tsx                              (redirigida a /manager/)
#      - src/pages/Login/LicenseCallback.tsx             (no aplica)
#      - src/lib/queries/{chat,chatwoot,dify,evoai,evolutionBot,flowise,n8n,openai,typebot,sqs,license}/

# 4. Crear branch + traer archivos relevantes
cd /home/user/webapp-wago
git checkout -b chore/upstream-evmgr-sync-$(date +%Y%m%d)
# Para cada archivo identificado en (3):
cp /tmp/evmgr-fresh/src/<path> manager-src/src/<path>

# 5. Re-aplicar nuestros patches wago en los archivos copiados:
#    - manager-src/src/pages/Login/index.tsx     (sin selector provider, sin licencia, branding wago)
#    - manager-src/src/lib/queries/auth/verifyGoServer.ts  (usa /instance/all no /server/ok)
#    - manager-src/src/lib/queries/react-query.ts (interceptor 401 con on401)
#    - manager-src/src/lib/queries/token.ts      (DEFAULT_PROVIDER = "go")
#    - manager-src/src/routes/index.tsx          (sin rutas Evolution-only, lazy + Suspense)
#    - manager-src/src/components/sidebar.tsx    (branding wago, sin Postman/Discord)
#    - manager-src/src/components/footer.tsx    (wago, sin useVerifyServer)
#    - manager-src/src/contexts/InstanceContext.tsx (seteo centralizado INSTANCE_TOKEN)
#    - manager-src/src/lib/queries/go/instance/{mapper,settingsFind}.ts (ignoreFromMe)
#    - manager-src/src/components/test-interactive-modal.tsx (endpoints /send/*)
#    - manager-src/index.html (title WebAPP-Wago + favicon local)
#    - manager-src/package.json (name webapp-wago-manager)
#    - manager-src/vite.config.ts (base /manager/ + manualChunks + proxy dev)

# 6. Verificar
cd manager-src && npm install && npm run build
# PASS limpio sin errores TS

# 7. Verificar features wago siguen funcionando con Playwright (corridas
#    históricas en /tmp/wago-verify/verify-v*.js — preservar si están)

# 8. Commit + push branch + PR
cd /home/user/webapp-wago
git commit  # mensaje: qué se trajo + qué patches se re-aplicaron
git push -u origin chore/upstream-evmgr-sync-$(date +%Y%m%d)
```

### Atribución Apache 2.0

Cada sync **mantiene**:
- `manager-src/NOTICE.md` con derivación a evolution-manager-v2
- Notice "Powered by Evolution Manager" en `components/{sidebar,footer}.tsx`
  y en `pages/Login/index.tsx`

NO retirar esos avisos. Son obligatorios por las 2 condiciones del repo
original.

---

## Checklist post-sync (cualquier upstream)

- [ ] `go build ./... && go vet ./...` PASS
- [ ] `go test ./... -count=1` PASS
- [ ] `go test -race ./pkg/webhook/... ./pkg/instance/...` PASS
- [ ] `cd manager-src && npm run build` PASS sin warnings TS
- [ ] `make docker-build` PASS (la imagen entera arma)
- [ ] Markers WAGO-PATCH presentes en los archivos del inventario
      (chequeo: `grep -c "WAGO-PATCH(ADR-0049" pkg/instance/model/...`
       y números esperados de cada uno)
- [ ] Playwright suites históricas verdes contra wago + Postgres reales
      (si están disponibles en `/tmp/wago-verify/`)
- [ ] CHANGELOG.md o RUN-LEDGER.md entrada nueva con qué se sincronizó

## Cadencia recomendada

- `tulir/whatsmeow`: mensual o cuando reporten un bug de protocolo.
- `EvolutionAPI/whatsmeow` (fork): cada 2-4 semanas.
- `EvolutionAPI/evolution-go`: trimestral o ante feature/bug específico.
- `EvolutionAPI/evolution-manager-v2`: trimestral o ante UX mejora
  específica.

NO sincronizar todos los upstreams en el mismo PR — separá por proyecto
para reversibilidad granular.
