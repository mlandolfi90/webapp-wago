# RUN-LEDGER — El Crisol

## RUN webhook-skip-from-me-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (extiende contrato dispatch + 2 modelos + 3 carriles)
Alcance: flag opt-in `IgnoreFromMe` simétrico — Instance (legacy +
  colas globales) y Webhook (multi-webhook ADR 0045+). Default true
  rompe el loop reportado: webhook → consumer → /send/text →
  *events.Message{IsFromMe:true} → webhook (loop infinito). Punto
  único de filtrado en CallWebhook; handler de events NO se toca
  (MarkRead/LID swap siguen normales). Markers WAGO-PATCH(ADR-0049)
  para identificar el patch al mergear upstream Evolution Go.
Carriles: backend (instance/webhook model + repo + service +
  whatsmeow.CallWebhook), webui (advancedModal + webhookForm +
  webhooksList), mcp (tools_instance + tools_webhooks). Disjuntos.
Planificador: contratos congelados antes de carrilar:
  ExtractEventMeta(data) (chat, sender string, isFromMe bool)
  (renombre de ExtractChatSender, único caller actualiza);
  MatchesFilter(..., isFromMe bool); Dispatch(..., isFromMe bool).
  Default true en ambos modelos = comportamiento por defecto
  protege contra loops sin requerir acción del usuario.
Arquitecto: APPROVE — 3 carriles disjuntos sin superficies
  calientes compartidas; sigue patrón existente de IgnoreGroups/
  IgnoreStatus en los 5 puntos requeridos (model + AdvancedSettings
  + repo Select + repo Updates + handler + UI). ADR 0049 con
  procedimiento de re-aplicación al mergear upstream.
Ingeniero: instance_model.go (+IgnoreFromMe en Instance +
  AdvancedSettings, default true gorm); instance_repository.go
  (Select + map Get/Update); webhook_model.go (+IgnoreFromMe default
  true gorm); webhook_service.go (WebhookInput.IgnoreFromMe *bool,
  toModel default true, MatchesFilter +isFromMe arg final, Dispatch
  +isFromMe, ExtractChatSender→ExtractEventMeta con triple retorno);
  whatsmeow.go CallWebhook (extrae isFromMe, propaga al dispatch
  multi-webhook, skip legacy + colas globales si isFromMe && instance.
  IgnoreFromMe con log marker); tools_helpers.go (boolArgOr helper);
  tools_instance.go (wago_advanced_set +ignoreFromMe con boolArgOr
  default true); tools_webhooks.go (create/update +ignoreFromMe en
  schema + buildWebhookBody solo si explícito); advancedModal.js
  (+checkboxRow Ignorar mis propios mensajes, default tildado);
  webhookForm.js (+ignoreFromMeRow al lado de enabledRow, build
  incluye ignoreFromMe); webhooksList.js (filterSummary +"incluye
  propios" chip cuando ignoreFromMe===false); ADR 0049 + README +
  RUN-LEDGER. 14 archivos con marker WAGO-PATCH(ADR-0049).
Verificador: PASS — go build/vet limpios; go test -race ./... TODO
  verde (7 paquetes con tests OK, 0 FAIL); nuevos casos cubren:
  TestMatchesFilterIgnoreFromMe (4 combos isFromMe×IgnoreFromMe +
  evaluación temprana antes del resto del filtro);
  TestExtractEventMeta (Message con IsFromMe true/false/no-bool,
  Receipt sin Info default false, todos los shapes legacy preservan
  cero-falsos-positivos); TestDispatchRespectsIgnoreFromMePerWebhook
  (2 webhooks con flags opuestos, isFromMe=true solo dispatcha al
  auditor, isFromMe=false dispara ambos); regresión: 17 casos
  existentes de TestMatchesFilter / TestExtractChatSender (renombrado)
  / TestNameLookup* / TestDispatch* / TestValidate* siguen verdes
  con las nuevas firmas; node --check verde en los 3 JS.
Integración: PASS — `grep WAGO-PATCH(ADR-0049)` devuelve los 14
  archivos del IMPACT-MATRIX (10 código + 2 docs + 2 tests/helpers);
  contratos REST extendidos sin breaking (campo nuevo opcional);
  multi-webhook recibe el isFromMe y filtra per-webhook, legacy
  filtra por instance.IgnoreFromMe; flag visible en advancedModal
  + webhookForm con default protector y help hint explicando el loop.
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-28 commit 1e5f605

## RUN multi-webhook-name-filter-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (extiende contrato del filtro con 2 dimensiones nuevas
  + cache + invalidación + nuevo paquete resolver + UI)
Alcance: la C "filtro por NOMBRE de grupo/contacto con glob"
  (Harness* matchea grupos cuyo nombre empieza con Harness, sin
  conocer JIDs y atrapando grupos creados después). Campos nuevos
  `chatNames` y `senderNames`; backend resuelve nombres on-demand
  (cache RAM por instancia, invalidación en GroupInfo/JoinedGroup/
  Contact/Connected events). Wildcards/JIDs/picker (ADR 0045/0046/
  0047) intactos.
Carriles: backend (model/service/resolver/wago_resolver/whatsmeow
  hook + MCP tool), webui (2 textareas en form). Disjuntos.
Planificador: NameResolver interface en pkg/webhook/service para
  romper ciclo (whatsmeow depende de webhook hoy via Dispatch);
  implementación en pkg/webhook/resolver/ usa clientPointer +
  GetJoinedGroups + Store.Contacts (APIs públicas estables de
  whatsmeow); invalidación full por instancia (no incremental) =
  más simple, mismo costo amortizado.
Arquitecto: APPROVE — nameCache lazy con `groupsLoaded`/
  `contactsLoaded` por instancia (evita refetch innecesario);
  Dispatch resuelve nombres SOLO si algún webhook los pide
  (perf-friendly); test exhaustivo de matchPatternAllowlist
  unificado (reusa para JIDs y nombres); ADR 0048
Ingeniero: webhook_model.go (+ChatNames, +SenderNames JSON);
  webhook_service.go (NameResolver interface, nameCache+RWMutex con
  flags loaded, lookups lazy groupName/contactName, InvalidateNames,
  matcher unificado matchPatternAllowlist, MatchesFilter +chatName/
  +senderName, Dispatch con short-circuit); nuevo paquete
  pkg/webhook/resolver/wago_resolver.go (usa GetJoinedGroups +
  Store.Contacts.GetAllContacts, APIs públicas estables); main.go
  (wiring del resolver); whatsmeow.go (interface
  +InvalidateWebhookNames, hook maybeInvalidateNames al fin de
  CallWebhook por eventType); MCP tools_webhooks.go (+chatNames/
  +senderNames en schema y body builder); webhookForm.js (+2
  textareas + helpHints), webhooksList.js (resumen extendido)
Verificador: PASS — go build/vet verdes; go test -race
  ./pkg/... ./internal/... TODO verde (10+ casos nuevos de matching
  por nombre: glob Harness*, exact match, OR de patrones, AND con
  JIDs, edge case name=""); 3 tests más para cache+invalidación:
  TestNameLookupCachesAndInvalidates (verifica 1 sola llamada con
  cache + 2 tras Invalidate), TestDispatchSkipsNameLookupIfNoWebhook
  NeedsIt (short-circuit verificado), TestNameCacheConcurrentAccess
  NoRace (50 goroutines, race detector limpio); node --check verde;
  Playwright captura 16/17 — form acepta `Harness*`/`Soporte*` y
  lista muestra "nombres grupo: Harness*, Soporte*"
Integración: PASS — contrato REST extendido (campos nuevos
  opcionales); webhook con solo JIDs no paga costo de lookup
  (short-circuit); legacy `Instance.Webhook` sigue intacto
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-27 — ADR 0048

## RUN webhook-filter-name-display-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (cambia contrato de visualización + parse bidireccional
  en las allowlists; toca el patrón establecido en ADR 0046)
Alcance: las allowlists chatIds/senders se ven y se escriben como
  `Nombre <JID>` (estilo RFC 5322). Al guardar se parsea solo el JID
  (el backend no cambia). Al editar un webhook existente, se enriquece
  cada JID con su nombre desde /group/list + /user/contacts.
Carriles: webui (1)
Planificador: extiende ADR 0046 sin tocar backend; formato elegido
  por usuario (estilo email Nombre <JID>)
Arquitecto: APPROVE — nameResolver compartido con cache lazy
  (Promise singleton por carga de form); parseLineToJid robusto
  (regex `<([^>]+)>` con fallback a línea cruda — preserva wildcards);
  prefill async (form renderiza, enrich se aplica cuando llega);
  ADR 0047
Ingeniero: nuevo manager/dist/assets/js/features/instances/webhooks/
  nameResolver.js (cache singleton por token, formatJid, parseLineToJid,
  parseTextareaToJids); jidPicker.js (append en formato `Nombre <JID>`);
  webhookForm.js (prefill async con loadNameMap, build usa
  parseTextareaToJids, placeholders + helpHints actualizados)
Verificador: PASS — node --check verde en los 3 archivos; Playwright
  end-to-end (12 capturas previas + 3 nuevas): picker escribe
  `Harness Pruebas <120363...@g.us>`, wildcard `*@g.us` se preserva
  mezclado, al editar un webhook guardado los JIDs del backend
  vuelven enriquecidos via loadNameMap, al guardar el body POST trae
  solo los JIDs (parseTextareaToJids verificado por log del console)
Integración: PASS — contrato REST sin cambios; tests Go pasados en
  corridas previas siguen verdes (esto es solo UI)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-27 — ADR 0047

## RUN webhook-filter-ux-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (extiende contrato filtro + patrón webui)
Alcance: (A) wildcards/glob en allowlists `chatIds`/`senders` con
  `path.Match` (`*@g.us`, `549*`, etc.); (B) selector por nombre en
  la webUI que llena los textareas con JIDs (lee /group/list y
  /user/contacts). Sin cambios al backend para B (la UI guarda JIDs).
Carriles: backend (matchAllowlist + tests), webui (webhookForm
  +selectores de grupos/contactos). Disjuntos — sin colisión.
Planificador: extiende ADR 0045 sin romper su contrato (un JID sin
  metacaracteres sigue siendo exact match — retrocompat 100%).
Arquitecto: APPROVE — usar stdlib `path.Match` (glob shell `*?[]`,
  no matchea separador pero los JIDs no llevan `/`); mantener
  `jid==""` como rechazo previo (no permitir bypass con `*`); UI lee
  endpoints existentes (no API nueva); ADR 0046
Ingeniero: (A) pkg/webhook/service/webhook_service.go: `path.Match`
  con guarda `ContainsAny("*?[")` en matchAllowlist; (B) nuevo
  manager/dist/assets/js/features/instances/webhooks/jidPicker.js +
  webhookForm.js (botones "Elegir grupos/contactos" + textareas con
  ayuda de wildcards) + webhooksList.js (pasa `inst.token`); ADR 0046
Verificador: PASS — go build verde; go test -race
  ./pkg/webhook/... ./internal/mcp/... verde (7 casos glob nuevos
  incluyendo edge case `*` con jid vacío); node --check verde en los
  3 archivos webui; retrocompat 100% (JIDs sin metacaracteres siguen
  siendo exact match)
Integración: PASS — backend acepta globs, webUI elige por nombre y
  guarda JIDs; ortogonales, no chocan
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-27 — ADR 0046

## RUN multi-webhook-filters-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (feature nueva: contrato REST + tabla + arquitectura +
  refactor de firma + patrón webui)
Alcance: webhooks múltiples por instancia con filtros inline
  (events + chatType + chatIDs + senders); legacy convive intacto
Carriles: backend (model/repo/service/handler/routes/migrate +
  refactor CallWebhook), webui (api/list/form), mcp-internal (4 tools)
Planificador: 2 Explore en paralelo + 1 Plan (validó diseño y forzó
  3 ajustes críticos: cambiar firma de CallWebhook, cache anti-N+1,
  separar Dispatch de sendToQueueOrWebhook); plan en
  /root/.claude/plans/cozy-leaping-honey.md
Arquitecto: APPROVE — tabla `instance_webhooks` nueva (no extender
  Instance), filtro inline (no entidad), dual-dispatch (legacy intacto),
  CallWebhook(+chatJID,+senderJID), cache RWMutex con Reload en CRUD,
  cascade delete, cap 20/instancia, validación URL http/https; ADR 0045
Ingeniero: nuevo paquete pkg/webhook (model + repository + service +
  handler); routes.go + main.go (DI + AutoMigrate + cascade vía
  DeleteByInstance); refactor mínimo CallWebhook (1 línea: Dispatch
  antes del legacy, sin cambiar firma — desviación pragmática del plan
  documentada en ADR 0045 §Extracción); webui (core/api.js +
  webhooks/webhookForm.js + webhooks/webhooksList.js + webhooksModal.js
  + botón en instanceCard.js); MCP (tools_webhooks.go + registro en
  tools.go con 4 tools); tests (webhook_service_test.go con matriz
  MatchesFilter + ExtractChatSender + Dispatch + validate;
  tools_test.go +TestWebhookCreateForwardsFilterBody); ADR 0045
Verificador: PASS — go build verde; go vet ./pkg/webhook/...
  ./internal/... verde; go test -race ./pkg/... ./internal/... TODO
  verde (incluye nuevo paquete + suite previa sin regresión); 5/5
  archivos webui pasan `node --check`; diff acotado al alcance
  aprobado; cap 20 + URL http/https + chatType enum + events ⊂ canónico
  todos cubiertos por tests
Integración: PASS — combinado verde (backend + mcp + webui); legacy
  (`Instance.Webhook`) intacto, dispatch nuevo orthogonal
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-27 — ADR 0045

## RUN profile-name-status-fix-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (toca contrato de 2 capas: MCP + webui)
Alcance: alinear callers al contrato backend real — MCP y webui mandan
  `{image}` a /user/profileName|profileStatus pero backend espera
  `{name}`/`{status}`; profilePicture (`{image}`) está OK y NO se toca
Carriles: mcp-internal, webui (serializados por el Steward; archivos
  disjuntos → sin colisión)
Planificador: contrato backend confirmado verdad
  (SetProfileNameStruct{name}, SetProfileStatusStruct{status},
  SetProfilePictureStruct{image}); bug en tools_user.go:119,131 y
  userForms.js:133,144; profilePicture correcto
Arquitecto: APPROVE — cambiar solo las 2 keys mal en cada capa; cero
  scope creep (no tocar profilePicture, no renombrar arg MCP `value`);
  test Go que captura el body POST; node --check webui; ADR 0044
Ingeniero: tools_user.go (profileName→{name}, profileStatus→{status};
  profilePicture intacto), userForms.js (pname→{name}, pstatus→{status};
  ppic intacto), tools_test.go (+TestProfileToolsUseBackendContractKeys)
Verificador: PASS — go build/vet verdes; go test -race ./internal/...
  verde (mcp+events+wago, nuevo test fija las 3 keys); node --check
  userForms OK; diff = solo 4 archivos previstos; profile_picture sin
  tocar (test lo fija en `image`)
Integración: N/A (carriles disjuntos, sin colisión de archivos)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17 — ADR 0044; corrige supuesto de ADR 0027

## RUN repo-organize-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (transversal, multi-archivo, borrado)
Alcance: organizar repo — 5 carriles auditoría read-only paralelos →
  Steward consolida → limpieza + docs al día
Carriles: backend-go, mcp-internal, webui, docs, infra-raíz
Planificador: 5 archaeologists Explore en paralelo (read-only); repo
  sano en general; hallazgos consolidados
Arquitecto: APPROVE acotado — solo bajo riesgo/alto valor; VETÓ mover
  RUN-LEDGER, gitignore de manager/dist+swagger (rompe build/UI),
  refactor de monolitos, y el fix profileName (→ corrida propia);
  ADR 0043
Ingeniero: borrado de 3 bloques de código muerto comentado
  (utils/instance_service/whatsmeow), docs/README.md + docs/adr/
  README.md (índices), README.md (endpoints reales), COMMANDS.md
  (ref rota), .gitignore (binarios); ADR 0043
Verificador: PASS — go build/vet verdes, go test pkg+internal verde,
  node --check 37, diff solo archivos previstos (cero cambio de
  comportamiento: solo comentarios muertos + docs)
Integración: PASS — combinado verde (build+test+webui)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## PENDIENTES (no bloquean; requieren acción externa al sandbox)
- **Sync upstream tulir→wago-patches** (DEGRADADO por pedido del humano):
  hay 3 commits de tulir nuevos (incl. proto bump v1039406452); al día
  con Evolution. Bloqueado: este entorno no puede pushear al fork (sin
  ssh, :22 bloqueado, sin token). Camino: merge GitHub-web por el humano
  → luego bump de submódulo por Crisol + validación de protocolo en
  dispositivo. Ref: docs/UPSTREAM.md, ADR 0042.
- **Validación real en dispositivo**: álbum agrupado (ADR 0038/0039) y
  checks azules en grupo (ADR 0037). Sin WhatsApp en el sandbox.
- ~~CI en GitHub Actions~~ **VERDE CONFIRMADO** (ADR 0040): commit
  77af274 (PR #1) — 6/6 checks success: Go build/vet/test, WebUI
  node --check, **Docker build (valida imagen + wago-mcp)**. Esto
  además cubre la validación de Docker build que el sandbox no puede
  correr (sin daemon): CI compila imagen + binario MCP en cada push.
- ~~BUG confirmado — profile name/status~~ **RESUELTO** en
  profile-name-status-fix-001 (ADR 0044): MCP y webui ahora mandan
  `{name}`/`{status}`; test de contrato fija las 3 keys. Pendiente
  opcional: validación del efecto visible en dispositivo real (el
  contrato ya está fijado por test estático).
- **Deuda técnica registrada** (no urgente, corridas dedicadas):
  monolitos `pkg/sendMessage/service/send_service.go` (~2960 líneas) y
  `pkg/whatsmeow/service/whatsmeow.go` (~2708) a factorizar; dedup
  `formatBR/MX` en `pkg/utils`. Ref: ADR 0043.

## RUN submodule-fork-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (infra: origen del submódulo, afecta clone/CI de todos)
Alcance: repuntar submódulo whatsmeow-lib al fork mlandolfi90/whatsmeow
  rama wago-patches; commit fijado SIN cambios (0923702, ancestro de
  wago-patches → cero cambio de build)
Carriles: infra (carril único)
Planificador: .gitmodules→EvolutionAPI; verificado que 0923702 es
  ancestro de fork/wago-patches (bccc4a2) → gitlink válido tras repuntar
Arquitecto: APPROVE — .gitmodules url=fork + branch=wago-patches,
  submodule sync, gitlink intacto, go build verde; UPSTREAM.md
  actualizado; ADR 0042
Ingeniero: .gitmodules (url=fork+branch=wago-patches), submodule sync,
  docs/UPSTREAM.md (mapa de fuentes), ADR 0042
Verificador: PASS — go build/vet verdes; gitlink intacto 0923702
  (submódulo NO modificado); 0923702 ⊂ wago-patches verificado; solo
  .gitmodules+docs cambian; CI revalida clone recursive en el push
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: pendiente

## RUN mcp-test-hardening-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (multi-archivo de test; endurece contrato verificado)
Alcance: subir cobertura wago/mcp(http,stdio)/events SIN cambiar
  producción; solo *_test.go nuevos; go test -race
Carriles: tests (carril único)
Planificador: APIs ya conocidas; reusar testServer()/push(); nombres
  únicos para no colisionar con tests existentes
Arquitecto: APPROVE — solo tests, aditivo, sin tocar producción ni
  contratos → sin ADR (Regla #1 no aplica: no cambia arquitectura);
  registrar en ledger
Ingeniero: wago/client_hardening_test.go, mcp/http_transport_test.go,
  mcp/stdio_transport_test.go, events/buffer_concurrency_test.go
Verificador: PASS — go vet limpio; go test -race ./internal/... verde
  (events/mcp/wago); diff = solo *_test.go + ledger (cero producción)
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN mcp-ws-events-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (subsistema nuevo, contratos, multi-archivo)
Alcance: cliente WebSocket entrante para el MCP → mismo events.Buffer;
  aditivo y opcional (MCP_WS_URL), no rompe el webhook
Carriles: mcp (carril único)
Planificador: gorilla/websocket v1.5.3 ya en go.mod (sin dep nueva);
  Buffer.Push(json.RawMessage); main.go arma buf y webhook
Arquitecto: APPROVE — internal/events/wsclient.go (RunWS con backoff,
  WSConfig inyectable para test), wiring en main (go RunWS si
  MCP_WS_URL); aditivo, sin tocar webhook/contrato; ADR 0041
Ingeniero: internal/events/wsclient.go (RunWS+WSConfig+DefaultWSConfig),
  cmd/mcp/main.go (wiring MCP_WS_URL + doc), wsclient_test.go; ADR 0041
Verificador: PASS — go build/vet/test verdes; tests con WS mock
  (recibe evento; reconecta tras corte, >=2 conexiones). 100%
  verificable en sandbox (sin dispositivo/backend real).
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN ci-pipeline-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (infra/CI, patrón de validación del repo)
Alcance: .github/workflows/ci.yml — go build/vet/test + node --check +
  docker build (validación), sin tocar publish_docker_image.yml ni código
Carriles: ci (carril único)
Planificador: ya existe publish_docker_image.yml (no tocar); go.mod
  go1.25; CGO necesita libwebp/libjpeg; submódulo público recursive
Arquitecto: APPROVE — ci.yml nuevo (jobs go/webui/docker), mirror de
  convenciones del publish (checkout recursive, buildx, gha cache,
  build-arg VERSION), push:false; ADR 0040
Ingeniero: .github/workflows/ci.yml (jobs go/webui/docker); ADR 0040
Verificador: PASS (limitación documentada) — YAML válido (PyYAML/yq),
  jobs go/webui/docker, triggers push+pull_request, docker push:false,
  publish_docker_image.yml intacto, sin tocar código. Ejecución real de
  Actions = auto-validación en el push de esta corrida.
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN album-propagate-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (propagación de contrato, multi-componente)
Alcance: exponer /send/album en MCP (wago_send_album) y webui (tipo
  "Álbum" en el compositor) — sin tocar backend
Carriles: mcp+webui (carril único, mismo contrato)
Planificador: contrato /send/album {number,items[{type,url}],caption}
  congelado en send-album-001; patrón tool/sender ya existe
Arquitecto: APPROVE — wago_send_album (tools_send.go) + sendAlbum
  (core/api.js) + entry "album" (senders.js); aditivo, reusa patrones;
  ADR 0039
Ingeniero: tools_send.go (+wago_send_album), tools_test.go,
  core/api.js (+sendAlbum), send/senders.js (+parseAlbumItems +entry
  "Álbum"); ADR 0039
Verificador: PASS — go build/vet/test verdes (test MCP wago_send_album:
  <2 falla, body ok, item inválido falla); node --check 37 JS OK;
  render Chromium del tipo "Álbum" sin errores de consola. Propagación
  100% verificable estática (sin dependencia de dispositivo).
Integración: N/A (validación real del álbum = pendiente HEREDADA de
  send-album-001/ADR 0038, no de esta corrida)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN send-album-001
STATUS: CLOSED (código) — validación real PENDIENTE (sin dispositivo)
Branch: claude/build-webui-AcJFe
Tier: completo (contrato público nuevo, protocolo, multi-archivo)
Alcance: POST /send/album — AlbumMessage padre + N hijos media con
  MessageContextInfo.MessageAssociation(MEDIA_ALBUM); solo backend
Carriles: backend (carril único)
Planificador: pipeline media (Upload+SendMessage) y proto waE2E
  (AlbumMessage f83, MessageContextInfo f35, MessageAssociation,
  waCommon.MessageKey) confirmados; API pública alcanza, sin patch al
  submódulo (ADR 0036)
Arquitecto: APPROVE — pkg/sendMessage/service/album.go (builders puros
  testeables + SendAlbum), handler+ruta+interfaz; reusa Upload; sin
  tocar submódulo; ADR 0038
Ingeniero: album.go, send_service.go (interfaz +SendAlbum), send_handler
  (+SendAlbum), routes.go (/send/album), +tests; ADR 0038
Verificador: PASS estático — go build/vet/test verdes (builders puros
  cubiertos: padre counts, hijo association/index/parentkey, caption
  solo en i=0). Validación real (álbum agrupado en WhatsApp) PENDIENTE
  del humano: sin dispositivo en sandbox.
Integración: PENDIENTE-REAL (humano valida que llegue como álbum)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17 — commiteado por contenedor efímero; check real
  abierto explícitamente (criterio acordado)

## RUN fix-markread-group
STATUS: CLOSED (código) — validación real PROVISORIA (no cerrada)
Branch: claude/build-webui-AcJFe
Tier: completo (contrato público, multi-componente, protocolo)
Alcance: fix read receipts en grupos — sender debía ser el participante
  autor, no el JID del grupo (riesgo de baneo)
Carriles: backend (carril único; MCP+webui propagan el mismo contrato)
Planificador: bug confirmado por doc whatsmeow.MarkRead; MarkReadStruct
  sin campo participant; ts nunca seteado (devolvía tiempo cero)
Arquitecto: APPROVE — campo opcional participant (retrocompat, DMs
  intactos), helper puro resolveReadSender testeable, propagación a
  MCP/webui en la misma corrida (mismo contrato, evita divergencia);
  ADR 0037
Ingeniero: pkg/message/service/message_service.go (+Participant,
  +resolveReadSender, ts fix), internal/mcp/tools_message.go,
  webui messageForms.js, +tests; ADR 0037
Verificador: PASS estático — go build/vet/test verdes (helper cubierto),
  node --check js OK, call-site revisado.
Integración: PROVISORIA — el humano reportó "eso funciona" (2026-05-17)
  pero queda como OBSERVACIÓN, no como validación formal: pendiente de
  una prueba reproducible/documentada (grupo de 2, evidencia) antes de
  darla por cerrada. NO asumir validado.
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17 — código commiteado; validación real abierta como
  observación provisoria por decisión del humano

## NOTA docs-upstream-001 (NO-CRISOL: solo documentación)
Fecha: 2026-05-17 · Branch: claude/build-webui-AcJFe
Tipo: docs (.md) → por la regla de tiers de El Crisol NO dispara las 4
  fases (no hay mutación código→commit). Se registra para trazabilidad.
Entregable: ADR 0036 (estrategia de upstreaming) + docs/UPSTREAM.md
  (runbook de sync con tulir/EvolutionAPI). Sin tocar código.
Pendiente externo anotado: bug reportado por agente hermano —
  /message/markread (read receipts) pasaría el JID del grupo como
  sender en vez del participante; a investigar read-only y, si se
  confirma, su PROPIA corrida de Crisol (backend Go) con visto del
  humano. No se aplica desde un reporte relayado.

## RUN mcp-docker-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (build/infra sensible, contrato de imagen)
Alcance: compilar y copiar el binario MCP en el Dockerfile sin romper
  caché/builder/submódulo; ENTRYPOINT principal intacto
Carriles: mcp (carril único)
Planificador: Dockerfile 2 stages; server build con doble cache mount;
  agregar RUN para ./cmd/mcp reusando mounts + COPY a final
Arquitecto: APPROVE — RUN aditivo (CGO off) con los mismos mounts,
  COPY wago-mcp, ENTRYPOINT sin cambios; docker build no validable en
  sandbox (verificación honesta documentada); ADR 0035
Ingeniero: Dockerfile (+RUN cmd/mcp CGO=0, +COPY wago-mcp, comentario
  de uso), ADR 0035
Verificador: PASS (limitación documentada) — build equivalente
  CGO_ENABLED=0 ./cmd/mcp = ELF estático OK; invariantes intactas
  (syntax, mounts 3/2, submódulo, ENTRYPOINT); go vet/test verdes
  (no-regresión). docker build no ejecutable (sin daemon) → CI/host
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN mcp-events-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (subsistema nuevo, contratos, multi-archivo)
Alcance: recepción de eventos — receptor webhook + buffer acotado +
  tools wago_events_poll/clear; mismo server (http) o aparte (stdio)
Carriles: mcp (carril único)
Planificador: http.go monta su propio mux; main elige transporte;
  BuildTools(c) → sumar EventTools(buf); buffer thread-safe acotado
Arquitecto: APPROVE — internal/events (buffer+webhook), http.ServeWith
  con rutas extra (retrocompat), tools_events, main compone; ADR 0034
Ingeniero: internal/events/{buffer,webhook}.go, internal/mcp/
  tools_events.go, http.go (ServeWith retrocompat), cmd/mcp/main.go,
  +tests (buffer/webhook/tools_events); ADR 0034
Verificador: PASS — go vet/build limpios; go test ./internal/... verde;
  e2e: POST /webhook → wago_events_poll devuelve y consume (count1→0)
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN mcp-tools-ext-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (amplía contrato del componente, multi-tool)
Alcance: catálogo MCP completo (send/instance/user/group/message/
  community/label/newsletter/polls/call) reusando wago.Do
Carriles: mcp (carril único)
Planificador: tools.go con 13 tools + helpers; un solo archivo con ~65
  sería cajón de sastre → partir por dominio
Arquitecto: APPROVE — tools_helpers.go + builders por dominio +
  BuildTools agregador; aditivo, credenciales intactas; ADR 0033
Ingeniero: tools_helpers.go, tools.go (agg), tools_{instance,send,
  message,user,group,misc}.go (~65 tools), tools_test.go; ADR 0033
Verificador: PASS (iter 2) — go vet/build limpios; go test verde;
  e2e stdio tools/list = 65; iter1 FAIL test path-escape → re-plan
  (aserción EscapedPath) → PASS
Integración: N/A (carril único)
Iteraciones: 2/3
Escalación: none
Cierre: 2026-05-17

## RUN mcp-server-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (componente nuevo, contratos, arquitectura)
Alcance: servidor MCP en Go (cmd/mcp) que envuelve la API REST;
  transportes stdio + HTTP; catálogo de tools del núcleo
Carriles: mcp (carril único)
Planificador: módulo webapp-wago go1.25; replace whatsmeow→submódulo;
  sin internal/; Makefile sin target mcp; Dockerfile sensible (CLAUDE.md)
Arquitecto: APPROVE — MCP hand-rolled stdlib-only (cero deps nuevas),
  internal/wago + internal/mcp + cmd/mcp; Makefile +target; Dockerfile
  intacto (follow-up); ADR 0032
Ingeniero: internal/wago/client.go, internal/mcp/{jsonrpc,server,tools,
  stdio,http}.go, cmd/mcp/main.go, Makefile (+mcp), ADR 0032; +tests
Verificador: PASS — go vet limpio; go build OK; go test ./internal/...
  verde (server+client); smoke e2e stdio (handshake/13 tools/scopes/
  error) y HTTP (healthz/initialize/list); go.mod/go.sum sin cambios
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17
FOLLOW-UP: integrar binario MCP en Dockerfile (corrida aparte)

## RUN webui-cardux-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (patrón UI de layout, multi-archivo, CSS)
Alcance: agrupar los ~15 botones de instanceCard en 3 secciones
  (Sesión / Operar / Zona peligro) sin cambiar comportamiento
Carriles: webui (carril único)
Planificador: instanceCard.js mapeado (15 botones en .card-actions);
  comportamiento por onclick a preservar
Arquitecto: APPROVE — helper local actionGroup, 3 grupos etiquetados,
  CSS aditivo, sin cambio de conducta; ADR 0031
Ingeniero: instanceCard.js (actionGroup + 3 grupos), app.css
  (.action-group*); ADR 0031
Verificador: PASS — node --check 37/37; render real Chromium: 3 grupos
  ["Sesión","Operar","Zona peligro"], 15 botones intactos, 0 errores
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN webui-debt-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (refactor de patrón sobre código que funciona)
Alcance: saldar deuda — groups/users usan _shared/tabbedForms.js;
  eliminar duplicación seg+modal+renderForm; no-regresión
Carriles: webui (carril único)
Planificador: usersModal.renderForm == copia exacta de tabbedForms;
  groupsModal duplica seg+modal+select; tabs custom (listas) requieren
  generalizar tabbedForms con render(area,inst,ctx)
Arquitecto: APPROVE — tabbedForms admite tabs custom (retrocompatible);
  groups/users finos; groupActions intacto (patrón distinto); ADR 0030
Ingeniero: _shared/tabbedForms.js (custom-tabs + ctx),
  users/usersModal.js (86→15), groups/groupsModal.js (sin scaffolding
  duplicado); ADR 0030
Verificador: PASS — node --check 37/37; render real Chromium 6 vistas
  no-regresión (grupos lista/gestionar/crear, users contactos/
  verificar-LID/privacidad), 0 errores de consola
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17
DEUDA-SALDADA: groups/users migrados a _shared/tabbedForms.js

## RUN webui-rest-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (varios dominios nuevos, multi-archivo, reuso patrón)
Alcance: Comunidades, Etiquetas, Newsletters, Polls, Llamadas vía
  _shared/tabbedForms.js
Carriles: webui (carril único)
Planificador: contratos community/label/newsletter/polls/call ya
  extraídos; tabbedForms reusable; evitar bloat de la tarjeta
Arquitecto: APPROVE — 4 catálogos (community/labels/newsletters/utils)
  + modales finos + fns api + 4 botones; sin tocar contratos; ADR 0029
Ingeniero: core/api.js (+16 fns), community/ labels/ newsletters/
  utils/ (catálogo+modal c/u), instanceCard (+4 botones); ADR 0029
Verificador: PASS — node --check 37/37; render real Chromium 5 vistas
  (comunidades/etiquetas/etiquetas-listar/newsletters/utilidades),
  0 errores de consola
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN webui-messages-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (dominio nuevo + extracción de helper compartido)
Alcance: dominio Mensajes (react/markread/delete/edit/status/
  downloadmedia) + helper _shared/tabbedForms.js
Carriles: webui (carril único)
Planificador: contratos /message/* confirmados; orquestación de
  pestañas-formulario duplicada en users → 3ª ocurrencia = extraer
Arquitecto: APPROVE — _shared/tabbedForms.js (consolida patrón),
  messages/ (catálogo + modal fino) + fns api; migración groups/users
  diferida y registrada (no tocar lo que funciona); ADR 0028
Ingeniero: _shared/tabbedForms.js, messages/messageForms.js,
  messages/messagesModal.js, core/api.js (+6 fns), instanceCard
  (import+botón Mensajes); ADR 0028
Verificador: PASS — node --check 29/29; render real Chromium 4 vistas
  (reaccionar/editar/estado-result/descargar), 0 errores de consola
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17
DEUDA-REGISTRADA: migrar groups/users a _shared/tabbedForms.js

## RUN webui-users-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (dominio nuevo, multi-archivo, patrón)
Alcance: dominio Usuarios/Contactos en la webui (contacts/check/info/
  avatar/blocklist/block/unblock/privacy/profile*)
Carriles: webui (carril único)
Planificador: contratos /user/* + enum PrivacySetting confirmados;
  reusa patrón groups (orquestador tabs + catálogo) + identityBlock
Arquitecto: APPROVE — users/ (usersModal orquestador + contactsList +
  userForms catálogo) + fns api, reusa modal/seg/field/helpHint/
  identityBlock/tema, instance-scoped, render defensivo; ADR 0027
Ingeniero: core/api.js (+12 fns user), users/usersModal.js,
  users/contactsList.js, users/userForms.js, instanceCard
  (import+botón Contactos); ADR 0027
Verificador: PASS — node --check 26/26; render real Chromium 4 vistas
  (contactos/verificar+LID/privacidad-prefill/perfil), 0 errores consola
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN webui-identity-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (nuevo patrón UI, multi-archivo, CSS)
Alcance: patrón de identidad — Nombre humano destacado + teléfono si
  hay + LID/JID siempre visible y copiable 1-clic
Carriles: webui (carril único)
Planificador: puntos de render (groupsModal card, groupActions header);
  toast/h reusables; clipboard necesita fallback (http)
Arquitecto: APPROVE — ui/identity.js (copyChip+identityBlock) reusable,
  sin tocar contratos, fallback execCommand, accesible; ADR 0026
Ingeniero: ui/identity.js, app.css (.identity*/.copy-chip),
  groups/groupsModal.js + groups/groupActions.js (identityBlock); ADR 0026
Verificador: PASS — node --check 23/23; render real Chromium: nombre
  protagonista, copia verificada (clipboard == JID exacto), toast,
  0 errores de consola
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN webui-groups-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (dominio nuevo, multi-archivo, patrón)
Alcance: gestión de grupos en la webui (list/create/info/invitelink/
  name/description/photo/participant/join/leave)
Carriles: webui (carril único)
Planificador: contratos /group/* extraídos (enum action add/remove/
  promote/demote); patrón seg/senders reusable; instanceCard mapeado
Arquitecto: APPROVE — groups/ (groupsModal orquestador 3 tabs +
  groupActions catálogo) + 10 fns api, reusa modal/field/helpHint/seg/
  tema, instance-scoped, render defensivo; ADR 0025
Ingeniero: core/api.js (+10 fns group), groups/groupsModal.js,
  groups/groupActions.js, instanceCard (import+botón Grupos); ADR 0025
Verificador: PASS — node --check 22/22; render real Chromium 5 vistas
  (lista/info/participantes/link/crear), 0 errores de consola
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN webui-seqsend-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (extiende patrón send + contrato sender)
Alcance: tipo "Varios (secuencial)" en el compositor: envía N medias en
  cola con pausa, reportando progreso en el botón
Carriles: webui (carril único)
Planificador: orquestador llama api(token,body); contrato extensible a
  api(token,body,onProgress?) retrocompatible; compone sendMedia
Arquitecto: APPROVE — extensión mínima retrocompatible del contrato
  sender, sin tocar backend, factorizado; ADR 0024
Ingeniero: send/senders.js (+tipo sequential), send/sendModal.js
  (onProgress), ADR 0024
Verificador: PASS — node --check 20/20; render real Chromium: 3 envíos
  secuenciales (gaps ~465ms respetan pausa), progreso 1/3..3/3, toast
  ok, 0 errores de consola
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN webui-richsend-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (multi-archivo, nuevo patrón UI, core/api.js)
Alcance: compositor multi-tipo de envío (text/media/link/location/poll/
  contact/sticker) en la webui /manager
Carriles: webui (carril único)
Planificador: contratos send/* extraídos de swagger; helpers modal/form/
  api mapeados; sendModal actual reemplazable
Arquitecto: APPROVE — carpeta send/ (senders.js declarativo + sendModal
  orquestador), reusa modal/field/helpHint/tema, sin tocar contratos
  backend; ADR 0023
Ingeniero: core/api.js (+6 fn send), send/senders.js, send/sendModal.js,
  instanceCard import, app.css (.seg); sendModal viejo eliminado; ADR 0023
Verificador: PASS — node --check 20/20; render real Chromium 5 vistas
  (texto/media/ubicación/encuesta+ayuda/contacto), 0 errores de consola
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-17

## RUN webui-fieldhelp-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (multi-archivo + nuevo patrón UI + CSS)
Alcance: ayuda contextual (icono "?" con tooltip: qué es / cómo se usa /
  ejemplo) al lado de cada campo de formulario en toda la webui /manager
Carriles: webui (carril único)
Planificador: inventario de campos (6 vistas) + helper field/checkboxRow
Arquitecto: APPROVE — UI-only, patrón centralizado en form.js, tooltip
  CSS puro y accesible, sin tocar contratos; ADR 0022
Ingeniero: form.js (helpHint + field/checkboxRow con help), app.css
  (.help/.help-pop/.field-label/.check-row), login/create/connect/send/
  advanced/proxy con textos de ayuda; ADR 0022
Verificador: PASS — node --check 19/19 módulos OK; render real Chromium
  4 vistas con tooltip visible (hover+focus), 0 errores de consola
Integración: N/A (carril único)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-16

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
Cierre: 2026-05-16 — commit 86aca02

## RUN webui-restyle-webapp-001
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (shell con sidebar + topbar + footer; Fase 1 de 2)
Alcance: recuperar look "WebAPP-Wago" pre-rebuild (sidebar fija con
  Dashboard/Instancias, topbar Swagger/Salir, footer con copyright,
  branding verde emerald) en vanilla puro sin volver a React. NO toca
  backend ni vista detalle inline (queda para Fase 2). Idioma base
  español (clarificado por el usuario mid-corrida).
Planificador: 5 archivos a tocar (2 nuevos shell.js + dashboardHomeView.js;
  3 mods index.html + app.css + router.js + dashboardView.js). Patrón
  shell factorizado para que vistas futuras hereden chrome
Arquitecto: APPROVE — preserva ADR 0019 (vanilla sin build) + ADR 0018
  (cache mounts Go intactos). Regla de oro #1 cumplida (ADR 0050).
  Regla de oro #2 cumplida (shell factorizado, sin monolitos)
Ingeniero: index.html (title + lang), app.css (var --brand-emphasis +
  bloque shell/sidebar/footer 60 LOC + media query mobile), shell.js
  (NUEVO 78 LOC), dashboardHomeView.js (NUEVO 21 LOC), router.js
  (+goInstances/+renderDashboardHome import; goDashboard → home),
  dashboardView.js (refactor para consumir renderShell, strings pt-BR
  → es-ES mid-corrida por pedido del usuario)
Verificador: PASS — node --check verde en los 4 JS. Render headless con
  Playwright + mock fetch: desktop dashboard / desktop instancias /
  mobile (390x844) sin errores en consola; sidebar / topbar / footer /
  navegación click verificados. Screenshots capturados.
Integración: N/A (carril único — manager/dist)
Iteraciones: 1/3 (1 fix tras 1ª pasada: gap vertical en mobile, se
  agregó grid-template-rows: auto 1fr)
Escalación: none
Pendientes (Fase 2): vista detalle de instancia con Informações da
  Instância + Configurações de Webhook + Configurações Avançadas +
  Zona de Perigo expandidos inline (reemplaza modales de Sesión).
  Modales de Operar (Enviar/Grupos/etc.) NO se tocan.
Cierre: 2026-05-28

## RUN webui-restyle-webapp-002
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (tema claro funcional + topbar completo con iconos)
Alcance: paridad con el dashboard de referencia que el usuario confirmó
  querer. Topbar API Tester (→swagger) + Swagger + toggle tema + Salir
  con iconos SVG; sidebar con iconos; tema claro/oscuro funcional con
  persistencia y anti-flash. Cards de instancia se conservan (el usuario
  aclaró que su UX real eran cards con botones, no detalle inline).
Planificador: 3 decisiones cerradas vía AskUserQuestion (detalle inline:
  NO; API Tester: →swagger; tema: claro funcional). 5 archivos: theme.js
  + icons.js nuevos; shell.js + app.css + index.html + main.js mods
Arquitecto: APPROVE — tema claro revierte parcialmente ADR 0021
  (dark-only) → ADR 0051 (regla de oro #1). Tokens en ambos temas, sin
  CDN (ADR 0019), iconos SVG inline. Sin tocar backend ni cards
Ingeniero: core/theme.js (NUEVO), ui/icons.js (NUEVO 7 iconos SVG),
  core/shell.js (topbar completo + iconos + toggle), app.css (bloque
  [data-theme=light] + --h-color + topbar/sidebar/footer theme-aware),
  index.html (script anti-flash), main.js (applyTheme en boot)
Verificador: PASS — node --check verde. Render headless: 4 acciones
  topbar / 2 iconos sidebar / toggle a light / persistencia tras reload /
  screenshots dark+light dashboard+instancias / 0 errores consola
Integración: N/A (carril único — manager/dist)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-28

## RUN webui-restyle-webapp-003
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (paridad pixel-near del login con el bundle pre-rebuild)
Alcance: regresión técnica del bundle pre-rebuild (commit cba0d60,
  React minificado) en un worktree + servidor SPA aware + screenshots
  reales del look que el usuario amaba. Replicado el login en vanilla:
  branding "WebAPP-Wago" grande centrado, card con sombra, 2 inputs
  (URL API + API Key), tip gris explicando GLOBAL_API_KEY, botón verde
  block, footer Términos/Privacidad, gradiente verde sutil de fondo
  (radial-gradient desde 110%). En es-ES como pidió el usuario.
Planificador: regresión del bundle viejo en /tmp/oldwago via git
  worktree b2c87ab~1 + python SPA fallback en :8766; capturas
  comparativas; identificación de gaps en mi loginView vs el viejo
Arquitecto: APPROVE — cambio CSS+1 JS sin tocar backend; preserva ADRs
  0018/0019/0050/0051; tokens theme-aware ya disponibles
Ingeniero: features/auth/loginView.js (rewrite con 2 inputs + tip +
  footer + brand grande), app.css (bloque .login-* nuevo con gradiente
  verde radial + tip card + foot links; medias para mobile)
Verificador: PASS — node --check verde; render headless dark+light
  desktop+mobile (4 capturas); match visual confirmado contra el
  bundle viejo en /tmp/o-login.png; sidebar/topbar/footer del shell
  intactos (login NO usa shell)
Integración: N/A (carril único — manager/dist)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-28

## RUN webui-restyle-webapp-004
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (card minimal + página detalle inline + paridad mobile)
Alcance: réplica exacta del look del bundle WebAPP-Wago pre-rebuild
  pedida por el usuario. Card de instancia con tabla Status/Propietario
  inline + 5 botones lucide (power-off / message-square / flask-conical
  / settings / trash). Engranaje → página Configuraciones inline con
  4 secciones (Información / Webhook / Avanzada / Zona de Peligro).
  Página Instancias con subtítulo, buscador, botón "Nueva instancia +".
  Mobile: sidebar oculto + brand en topbar + iconos sin texto.
Planificador: regresión técnica del bundle pre-rebuild (worktree
  b2c87ab~1 + server SPA-aware en :8766 + parche minimal al JS para
  bypassar licencia + isAuthenticated). Iconos detectados via
  enumerate de botones + svg.className. Confirmado flow gear → detalle
  inline mediante click programático.
Arquitecto: APPROVE — preserva ADRs 0018/0019/0050/0051; nuevo ADR
  0052 (regla de oro #1) por cambio observable de UX. Lógica de
  webhook multi (ADRs 0045+) y advanced-settings intactas. CSS
  factorizado por componente (regla de oro #2).
Ingeniero: ui/icons.js (+12 iconos lucide), instanceCard.js (refactor
  completo a card minimal con 5 botones), configView.js (NUEVO 198 LOC,
  página detalle con 4 secciones), dashboardView.js (subtítulo +
  search + + ico), router.js (+goInstanceConfig), shell.js (brand-
  mobile + title dinámico del toggle), app.css (+~250 LOC en bloque
  card-instance / search / page-head / config-section / toggle-switch /
  danger-row / mobile shell; bug-fix .identity-name #fff → var(--h-color))
Verificador: PASS — node --check verde en los 6 JS; render headless
  desktop light/dark + mobile + página config, 0 errores consola.
  Comparativa side-by-side con bundle: match en branding, layout,
  iconos, jerarquía visual. 1 iteración + 1 fix (.identity-name color
  hardcoded). Cleanup: git worktree remove /tmp/oldwago.
Integración: N/A (carril único — manager/dist)
Iteraciones: 1/3
Escalación: none
Cierre: 2026-05-28

## RUN webui-react-bootstrap-01
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (multi-archivo + arquitectura + contratos build + revierte ADR 0019 + 2 ADRs nuevos)
Alcance: bootstrap del nuevo panel React+Vite+Radix en `manager-src/`
  (setup completo + Shell + Login + Dashboard placeholder + theming
  dark/light + i18n es-ES/pt-BR) + Dockerfile multi-stage con stage
  Node antes del stage Go preservando los cache mounts Go (ADR 0018)
  + Makefile targets `manager-deps`/`manager-build`/`manager-dev` +
  ADR 0053 (reversal de 0019 con crédito a Evolution Manager v2) +
  ADR 0054 (stack frontend + estructura de carpetas) + nota
  técnica 0010. `manager/dist` vanilla actual queda intacto en este
  commit; el primer `make manager-build` o `docker build` lo
  reemplaza. Atribución Apache 2.0 cumplida con footer "Powered by
  Evolution Manager" + link al repo + `manager-src/NOTICE.md`.
Carriles: único — bootstrap-frontend (sin colisiones; manager/dist
  no se toca; backend Go intacto; submódulo whatsmeow-lib intacto).
Planificador: contratos congelados antes de codear: API client con
  envelope `{message,data}` + header `apikey` (compatible con backend
  existente, sin breaking); ruteo `basename: "/manager"` (matchea el
  prefijo donde el binario Go sirve estáticos); CSS vars HSL mismo
  esquema que vanilla actual (theming consistente sin re-diseño);
  Dockerfile preserva cache mounts Go y sólo agrega cache mount npm.
Arquitecto: APPROVE — superficies disjuntas; `manager/dist` no se
  toca en este commit (transición progresiva); cache mounts Go
  intactos (ADR 0018 ✓); REGLA ORO #1 satisfecha (ADRs 0053+0054 +
  nota 0010); REGLA ORO #2 satisfecha (todo factorizado por carpeta;
  un componente por archivo; api/ + components/ui/ + layouts/ +
  pages/ + lib/i18n/ + lib/theme/).
Ingeniero: 32 archivos nuevos + 3 editados.
  Nuevos en `manager-src/`: package.json, package-lock.json
  (generado por npm ci), vite.config.ts, tsconfig.json,
  tailwind.config.js, postcss.config.js,
  components.json, index.html, .gitignore, NOTICE.md, public/
  favicon.svg, src/main.tsx, src/App.tsx, src/router.tsx,
  src/index.css, src/lib/utils.ts, src/lib/api/client.ts,
  src/lib/api/auth.ts, src/lib/i18n/index.ts, src/lib/i18n/locales/
  es.json, src/lib/i18n/locales/pt.json, src/lib/theme/
  theme-provider.tsx, src/components/ui/{button,card,input,label,
  theme-toggle}.tsx, src/layouts/{Shell,AuthGate}.tsx,
  src/pages/{Login,Dashboard,NotFound}.tsx.
  Nuevos en docs/: adr/0053-revertir-vanilla-react-vite.md, adr/
  0054-stack-frontend-react-vite-radix.md, notes/0010-manager-react-
  stack.md.
  Editados: Dockerfile (stage `frontend-builder` con cache npm +
  stage final copia el SPA del stage Node), Makefile (3 targets
  nuevos en sección Manager), .gitignore (ignora node_modules/dist
  de manager-src).
Verificador: PASS — `npm ci` reproducible (lockfile commiteado, 159
  paquetes); `tsc --noEmit` strict sobre todo `src/` limpio (1 iter
  de fix: bajamos a `tsc --noEmit && vite build` para evitar el
  conflicto de project references emit-vs-noEmit); `npm run build`
  produce dist/index.html (812 B) + assets/index-*.js (363 KB) +
  assets/index-*.css (13.65 KB); bundle contiene "Powered by
  Evolution Manager" + "WebAPP-Wago" + header "apikey" + basename
  "/manager" verificados por grep; `go build ./cmd/webapp-wago`
  PASS (63 MB, no roto por el cambio de Dockerfile); Dockerfile
  estructuralmente válido: 3 stages (frontend-builder/build/final),
  cache mounts Go preservados (3 instancias intactas por ADR 0018),
  cache mount npm agregado, stage final copia SPA desde
  `frontend-builder`; submódulo whatsmeow-lib intacto. NO
  VERIFICADO: `docker build` end-to-end porque el daemon no está
  levantado en el entorno remoto — cadena demostrada componente por
  componente (Vite build PASS + Go build PASS + Dockerfile estructura
  PASS).
Integración: N/A (carril único)
Iteraciones: 1/3 (1 fix de tsconfig project-references)
Escalación: none
Cierre: 2026-05-29 commit b3be3f1

## RUN webui-react-bootstrap-02-verify
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (extiende corrida 01 con verificación E2E real:
  Postgres + Wago en Docker + Playwright headless; 2 defectos
  encontrados y corregidos)
Alcance: verificación end-to-end con browser headless del bootstrap
  React contra backend Go real. Suite Playwright de 20 checks
  cubre: redirect a /login sin auth, `<title>`, marca WebAPP-Wago,
  notice "Powered by Evolution Manager" en login y footer del Shell
  con link correcto, botón submit deshabilitado sin key, login con
  key inválida muestra error en es-ES, login con key correcta
  navega a /dashboard, sidebar con Dashboard+Instancias, header
  con Swagger+Salir+ThemeToggle, footer del Shell con notice,
  KPIs renderizan, theme toggle cambia data-theme y persiste en
  localStorage, logout limpia apikey y vuelve a /login, 0
  errores de consola genuinos (1 esperado del 401 del test
  intencionalmente fallido).
Defectos encontrados y corregidos (2):
  1) pkg/routes/routes.go — el handler /manager/*any del backend
     servía index.html con MIME text/html para los assets de Vite
     (/manager/assets/*.js), causando que Chromium rechazara los
     ES modules por strict MIME checking. Fix: handler que stat-
     ea el archivo en disco antes de caer al SPA fallback (Gin
     no permite Static("/manager/assets") junto con catch-all
     /manager/*any por conflict de patterns).
  2) manager-src/src/layouts/Shell.tsx — el grid template hacía
     que <main> y <header> ocuparan la MISMA celda en desktop
     (col-start-2 row-start-1) lo que provocaba que main
     interceptara los clicks del ThemeToggle. Fix: grid-rows-
     [auto_1fr_auto] uniforme en ambos breakpoints, sidebar con
     md:row-span-3, header/main/footer en rows 1/2/3 sin solape.
Carriles: único — verify+fix-pipeline (route handler + Shell grid;
  ambos editados por el mismo ingeniero secuencialmente).
Planificador: Postgres 16-alpine local + Wago contenedor
  apuntando a PG_IP con GLOBAL_API_KEY=test-key-12345; Playwright
  chromium headless con suite de 20 asserts contra
  http://localhost:4000/manager/.
Arquitecto: APPROVE — ambos fixes son point-fixes (handler de
  estáticos + grid Tailwind); no rompen contratos; no nacen ADRs
  nuevos porque son fixes de corrida y no decisiones
  arquitectónicas. ADR 0053/0054 + nota 0010 siguen vigentes
  como fuente de verdad del diseño.
Ingeniero: pkg/routes/routes.go (+ import os, path/filepath;
  managerHandler con os.Stat+filepath.Clean; preserva /assets
  compat vanilla); manager-src/src/layouts/Shell.tsx (refactor
  del grid: grid-cols-1 md:grid-cols-[260px_1fr] + grid-rows-
  [auto_1fr_auto] + aside md:row-span-3; header/main/footer en
  rows 1/2/3 col-start-2 en md).
Verificador: PASS 20/20 — Playwright headless contra Wago real
  con Postgres real reporta todos los checks verdes (login en
  ambos paths happy+sad, navegación, theme toggle persistente,
  logout, ausencia de errores de consola); 3 screenshots de
  evidencia (01-login.png + 02-dashboard-dark.png + 03-dashboard
  -light.png) generados en /tmp/wago-verify/.
Integración: PASS — la imagen Docker resultante (webapp-wago:
  latest, 298 MB) corre contra Postgres 16-alpine, sirve el SPA
  React, valida apikeys contra GLOBAL_API_KEY y atribuye
  visiblemente al proyecto original Evolution Manager v2.
Iteraciones: 2/3 (iter 1 = corrida 01; iter 2 = 2 fixes de esta
  corrida).
Escalación: none
Cierre: 2026-05-29 commit 5fa93ce

## RUN webui-instances-webhooks-01
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (nuevas páginas + nuevos primitives Radix + nuevos
  endpoints API client + extensión del flujo de usuario)
Alcance: páginas Instances (lista con cards + crear + borrar) +
  InstanceConfig (detalle con tabs Info/Webhooks) + WebhookList
  (CRUD con filtro inline ADR 0045+ ADR 0046 ADR 0047 ADR 0048
  ADR 0049). Consume el modelo ACTUAL del backend; los transports
  per-webhook (RabbitMQ/WS/NATS embebidos en cada Webhook row)
  NO entran — requieren extender backend Webhook model (corrida
  futura). Suite Playwright extendida a 25 checks contra backend
  Go + Postgres reales.
Carriles: único — webui-pages-domain (frontend; cero backend
  changes).
Planificador: contratos congelados antes de codear: instances API
  via GLOBAL_API_KEY (admin); webhooks API via token de instancia
  per-call (instanceFrom(ctx) en handler → middleware Auth (no
  AuthAdmin)). lib/api/client.ts ya soporta apikey override per
  call. Eventos válidos: solo MAYÚSCULAS (MESSAGE, SEND_MESSAGE,
  READ_RECEIPT, PRESENCE, CONNECTION, CALL, GROUP, CONTACT,
  QRCODE) por pkg/internal/event_types.
Arquitecto: APPROVE — estructura factorizada por dominio
  (components/webhook/ agrupa lo del dominio); primitives nuevos
  (dialog/switch/select/tabs/textarea/badge/separator) son
  primitives Radix oficiales con patrón shadcn coherente con los
  existentes; no se introducen ADRs nuevos (ADR 0054 sigue siendo
  la fuente de verdad del stack); REGLA ORO #2 satisfecha (un
  componente por archivo, dominios separados, sin cajón de
  sastre); REGLA ORO #1 N/A (sin cambio arquitectónico — sigue
  el patrón ya documentado en ADR 0054).
Ingeniero: 7 primitives nuevos (button/card/input/label/theme-
  toggle existían, sumo dialog/switch/textarea/select/tabs/badge/
  separator) + 5 componentes de dominio (InstanceCard,
  InstanceCreateDialog, WebhookList, WebhookFormDialog,
  WebhookFilterFields) + 2 cliente API nuevos (instances.ts,
  webhooks.ts) + types.ts compartido + 2 páginas
  (Instances.tsx, InstanceConfig.tsx) + router actualizado +
  i18n es/pt extendidos. Total 16 archivos nuevos + 3 editados
  (router.tsx, es.json, pt.json) + package.json deps (+5 paquetes
  Radix).
Defectos encontrados y corregidos durante verificación (2):
  1) InstanceCreateDialog.tsx — backend exige `token` no vacío
     en /instance/create; el dialog no lo mandaba. Fix:
     crypto.randomUUID() como token automático.
  2) WebhookFormDialog.tsx — defaults de KNOWN_EVENTS estaban
     en lowercase (message, connection, etc.) pero el backend
     valida con pkg/internal/event_types que exige MAYÚSCULAS.
     Backend rechazaba con "event type inválido". Fix: lista
     actualizada con los 9 eventos MAYÚSCULA del whitelist real.
Verificador: PASS 25/25 — Playwright headless contra wago real
  con Postgres real. Flujo completo: login → sidebar Instancias →
  empty state → crear instancia → card en lista con badge
  Desconectada → click Configurar → detalle con tabs Info/
  Webhooks → tab Info muestra Token/ID/JID/CreatedAt → switch
  a Webhooks → empty state con hint sobre token de instancia →
  abrir form → completar URL + filtro nombres chat "Harness*" →
  crear → webhook en lista con badge Activo → editar (precarga
  URL) → cambiar URL → guardar → webhook actualizado → borrar
  webhook (lista vacía) → botón Volver → /instances → borrar
  instancia (con confirm) → empty state. 5 screenshots de
  evidencia (04-instances-empty + 05-with-card + 06-config-info
  + 07-webhook-form + 08-webhooks-list).
Integración: PASS — imagen Docker idéntica al pipeline de la
  corrida 01 (Dockerfile sin cambios); el bundle creció a 492.86
  KB JS + 22.24 KB CSS (vs 363 + 13 antes) por los nuevos
  primitives Radix y páginas; backend NO modificado.
Iteraciones: 1/3 (2 fixes intra-corrida durante el verificador,
  cada uno < 5 LOC, no contaron como re-planificación).
Escalación: none
Cierre: 2026-05-29 commit a76710a

## RUN webui-transports-settings-connect-01
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (3 carriles secuenciales: backend + frontend paneles +
  responsive QA; toca contrato del modelo Webhook + 5 paneles nuevos
  + 4 cliente API + ADR nueva)
Alcance: cierra las 3 features pendientes en una sola corrida.
  Carril A: extender modelo Webhook con 3 transports per-webhook
  (RabbitMQ/WebSocket/NATS) booleanos + Dispatch que respeta los flags
  + 4 tests + ADR 0055. Carril B: 5 paneles nuevos en
  components/instance-config/ (Settings, Proxy, Conexión con QR poll,
  Sender de prueba, Zona de peligro con confirm fuerte) + 4 cliente
  API nuevos + WebhookFormDialog actualizado con 3 toggles de
  transports + refactor InstanceConfig a sidebar interno desktop +
  dropdown mobile. Carril C: suite Playwright extendida (24 checks
  desktop + mobile) contra Wago real + Postgres real.
Carriles: 3 secuenciales (A → B → C). Tocan archivos compartidos
  (lib/types.ts, WebhookFormDialog.tsx, InstanceConfig.tsx) — no
  paralelos.
Planificador: contratos congelados pre-codear: backend extiende
  Webhook con 3 bool defaults false; Dispatch respeta producers nil
  (config global apagada); cliente API per-webhook usa token de
  instancia (mismo patrón que webhooks.ts). Mobile-first: dialogs
  max-h-90vh + width calc(100vw-2rem), sidebar interno colapsa a
  Select dropdown <768px.
Arquitecto: APPROVE — ADR 0055 deposita el cambio arquitectónico
  (REGLA ORO #1). Factorización por dominio: cada panel en su
  archivo bajo components/instance-config/ (REGLA ORO #2). Cliente
  API uno por dominio (settings/proxy/connection/sendMessage).
  Setter SetTransports en vez de constructor extendido para no
  romper callers existentes ni tests del backend.
Ingeniero: 3 commits secuenciales.
  Carril A (commit 8482745): pkg/webhook/model/webhook_model.go +3
    fields; pkg/webhook/service/webhook_service.go (WebhookInput +3
    *bool, struct +3 producers, SetTransports en interface, toModel
    copia los 3, Dispatch publica nil-safe); cmd/webapp-wago/main.go
    (SetTransports tras NewWebhookService); webhook_service_test.go
    (+4 tests: HTTPOnlyByDefault/AllTransports/SelectiveTransports/
    NilSafe); docs/adr/0055-webhook-transports-per-webhook.md.
  Carril B (commit cc51adc): manager-src/src/{lib/types.ts +6 tipos
    +3 fields Webhook, lib/api/{settings,proxy,connection,sendMessage}
    .ts (4 nuevos), components/instance-config/{Settings,Proxy,
    Connection,SendTest,DangerZone}Panel.tsx (5 nuevos), components/
    webhook/WebhookFormDialog.tsx (+3 toggles), components/ui/dialog
    .tsx (max-h-90vh + overflow-y-auto + width responsive), pages/
    InstanceConfig.tsx (refactor a sidebar interno + dropdown mobile
    con 7 secciones), lib/i18n/locales/{es,pt}.json (+~80 strings).
  Carril C (commit pendiente): RUN-LEDGER + nothing-else (la suite
    Playwright vive en /tmp).
Defectos encontrados y corregidos durante verificación (0 del
  panel — todos del test script):
  - Test 4: selector `nav button[role="tab"]` ambiguo (Shell global
    también tiene <nav>). Fix: `button[role="tab"][aria-selected]`.
  - Test 7: timing del toast sonner; subido a 3000ms y check con
    `[data-sonner-toast]` genérico.
  - Test 8: Badge es <div> no <span>. Fix: `text=` plano.
  - Test 13: "Zona de peligro" aparece en sidebar+dropdown+panel
    título. Fix: selector específico al botón.
  - Test 16: 400 esperado al guardar proxy.example.com (no
    alcanzable). Fix: filtra 400 además de 401/500.
Verificador: PASS 24/24 — Playwright headless contra Wago real con
  Postgres real, viewports desktop (1280x720) y mobile (390x844).
  Cubre: sidebar interno 7 secciones, Settings PUT con toggle +
  msgRejectCall, Proxy save con feedback, Conexión status badge,
  Sender form, Webhook form con 3 transports nuevos, GET /webhook
  devuelve `natsEnable:true` (validación end-to-end del ADR 0055),
  DangerZone confirm fuerte (disabled vacío → disabled mal nombre →
  enabled con nombre exacto), mobile sidebar oculto + dropdown +
  sin scroll horizontal + dialog max-h-90vh + scroll interno.
  Backend: `go test ./pkg/webhook/... -count=1` PASS con 4 tests
  nuevos en verde. 7 screenshots de evidencia (4 desktop + 3
  mobile).
Integración: PASS — Imagen Docker rebuildeada (298 MB) con
  backend extendido + bundle React extendido (509 KB JS, 22.85 KB
  CSS). MIMEs correctos. Backend acepta y persiste los 3 nuevos
  campos via GORM AutoMigrate. ADR 0055 verificada end-to-end
  (frontend manda `natsEnable:true`, backend persiste, GET
  devuelve el campo en el response).
Iteraciones: 1/3 (5 fixes intra-corrida solo del test script —
  ninguno del panel ni del backend; no cuentan como
  re-planificación).
Escalación: none
Cierre: 2026-05-29 (SHAs A=8482745, B=cc51adc, C al push final)

## RUN webui-dashboard-real-metrics-01
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (cierra Dashboard placeholder con datos reales)
Alcance: reemplazar las 4 KPIs placeholder del Dashboard ("—") con
  métricas reales: Instancias (count de /instance/all), Conectadas
  (filter connected:true), Webhooks activos (enabled/total agregando
  con useQueries paralelo sobre cada token de instancia). Mensajes
  hoy queda como "—" honesto: el backend no expone counter sin
  polling pesado.
Carriles: único — frontend (Dashboard.tsx + i18n strings).
Planificador: contrato congelado — useQuery para /instance/all
  con refetch cada 30s, useQueries paralelo para webhooks
  per-instance con retry:0 (errores per-token toleran). Total/active
  agregados en render. data-testid="kpi-{key}" para selectors
  estables de Playwright.
Arquitecto: APPROVE — sin cambios arquitectónicos. Reutiliza los
  clientes API existentes (instances.ts + webhooks.ts). Sin ADR
  nueva (no aplica REGLA ORO #1). Factorización mantenida — el
  Dashboard sigue siendo un único archivo cohesivo. Mobile-first:
  grid sm:cols-2 lg:cols-4 (corrida actual mantiene corrida 3+4).
Ingeniero: manager-src/src/pages/Dashboard.tsx (refactor completo
  a useQuery + useQueries; KPI values dinámicos; botón Actualizar
  con spinner; data-testid en cada card); manager-src/src/lib/i18n/
  locales/{es,pt}.json (cambia placeholderNote por tip más útil).
Defectos encontrados (1 — del backend, no del Dashboard):
  - Backend POST /webhook con enabled:false termina como
    enabled:true (GORM `gorm:"default:true"` aplica al zero-value
    bool de Go aunque el JSON envíe false). Workaround en el test:
    crear con enabled:true → PUT explícito con enabled:false. El
    Dashboard lee correctamente el campo cuando viene del backend.
    El bug del backend NO es scope de esta corrida; lo dejo
    documentado para futura ADR/corrida (involucra cambiar el
    model o el toModel para usar puntero, breaking).
Verificador: PASS 11/11 — Playwright desktop 1280x720 y mobile
  390x844. Cubre: empty state (0/0/—/0/0), con 2 instancias + 3
  webhooks (1 disabled vía PUT) muestra 2/0/—/2/3, mobile cards
  apiladas sin scroll horizontal. Sin errores de consola.
Integración: PASS — imagen Docker rebuildeada con el nuevo
  Dashboard.tsx; el backend no cambió.
Iteraciones: 1/3 (1 fix del test para sortear el bug GORM).
Escalación: none
Cierre: 2026-05-29 (SHA al push final)

## RUN webhook-gorm-default-bool-fix-01
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (bug fix de contrato observable en backend; descubierto
  por la corrida anterior `webui-dashboard-real-metrics-01` cuando
  Playwright vio "3/3" donde debía ser "2/3")
Alcance: quitar el tag GORM `default:true` de los dos campos bool del
  modelo Webhook (Enabled, IgnoreFromMe). El default ya vive en
  webhook_service.toModel(); el tag era redundante y conflictivo
  porque GORM aplica el default al zero-value bool de Go (false),
  pisando un POST explícito con enabled:false / ignoreFromMe:false.
Carriles: único — backend (model + tests).
Planificador: ningún cambio en el contrato API. El service ya
  manejaba el default correctamente vía `*bool` en WebhookInput. Sólo
  se elimina la doble-fuente-de-verdad del default (model tag +
  service code). Registros existentes no migran (todos ya tienen un
  valor persistido).
Arquitecto: APPROVE — bug fix puro. Sin ADR nueva (no cambia el
  contrato observable de la API ni el modelo desde Go; cambia el
  comportamiento de POST/PUT que ahora respeta el valor explícito).
  Sin scope creep — bug fix encontrado por test propio.
Ingeniero: pkg/webhook/model/webhook_model.go (quita
  `gorm:"default:true"` de Enabled e IgnoreFromMe + comentarios
  explicando dónde vive ahora el default); pkg/webhook/service/
  webhook_service_test.go (+3 tests: TestToModelEnabledFalseRespects
  Explicit, TestToModelEnabledOmittedDefaultsTrue,
  TestToModelIgnoreFromMeFalseRespectsExplicit).
Verificador: PASS — `go test ./pkg/webhook/... -count=1` PASS
  incluyendo los 3 nuevos tests y todos los anteriores. Verificación
  E2E manual con curl: POST /webhook con {"enabled":false} ahora
  devuelve "enabled":false en el body Y un GET subsiguiente también
  retorna false (antes ambos devolvían true). Verificación E2E
  Playwright: corrida 11/11 PASS del Dashboard re-ejecutada sin el
  workaround del PUT-explícito; el POST persiste correctamente.
Integración: PASS — imagen Docker rebuildeada (backend cambió). El
  frontend no se tocó.
Iteraciones: 1/3 (sin fixes; tests pasaron al primer intento).
Escalación: none
Cierre: 2026-05-29 (SHA al push)

## RUN webui-code-splitting-01
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (refactor de routing + tooling — observable en bundle output)
Alcance: dividir el bundle React (510 KB main warning) en chunks
  separados via lazy routes (cada página un chunk) + manualChunks
  para libs gordas estables (react-router, tanstack-query,
  radix-ui, i18next). Reduce el JS necesario en el primer paint
  desde 510 KB → 78 KB main + chunks separados que cargan on-demand.
Carriles: único — frontend (router + vite.config).
Planificador: lazy de las 5 páginas (Login, Dashboard, Instances,
  InstanceConfig, NotFound) con Suspense fallback (spinner brand).
  manualChunks por id que matchea node_modules de las 4 libs
  identificadas como estables y >40 KB cada una.
Arquitecto: APPROVE — sin cambios funcionales ni de contrato.
  Mejora performance del first paint y mejora la cacheabilidad de
  libs entre deploys (el chunk vendor-router no cambia salvo bump
  de versión). Sin ADR nueva — es optimización de tooling, no
  decisión arquitectónica.
Ingeniero: manager-src/src/router.tsx (refactor a React.lazy + Suspense
  con PageFallback spinner accesible aria-live=polite + helper
  lazyPage(Component)); manager-src/vite.config.ts (build.rollupOptions
  .output.manualChunks por id-test).
Verificador: PASS — vite build muestra 17 chunks separados:
  index principal cae a 78.03 KB (gz 24.51 KB) desde 514.13 KB
  (gz 160.48 KB) = -85%; vendor-router 198 KB lazy; vendor-radix
  82 KB lazy; vendor-i18n 58 KB lazy; vendor-query 50 KB lazy;
  páginas en chunks de 0.65-32 KB cada una. Playwright suite
  Dashboard 11/11 PASS (lazy + Suspense en carga inicial OK).
  Playwright suite Instances 25/25 PASS (lazy de InstanceConfig +
  WebhookList sin regresión).
Integración: PASS — imagen Docker rebuildeada con el nuevo bundle.
  Backend no cambió.
Iteraciones: 1/3 (sin fixes; lazy + Suspense compiló al primer
  intento sin errors TS strict).
Escalación: none
Cierre: 2026-05-29 (SHA al push)

## RUN ci-align-react-stack-01
STATUS: CLOSED
Branch: claude/build-webui-AcJFe
Tier: completo (alinea CI con el stack post-ADR 0053)
Alcance: el job webui del CI hacía `node --check` sobre
  `manager/dist/assets/js/**/*.js` — el bundle vanilla viejo que
  ADR 0053 reemplazó. Pasaba por accidente porque el filesystem
  retenía el vanilla. Fix: cambiar el job a `npm ci + npm run build`
  en `manager-src/` (el verdadero source del panel React) +
  sanity-check del output. Eliminar el bundle vanilla versionado +
  gitignorear `manager/dist/` con README explicativo.
Carriles: único — CI + housekeeping del repo.
Planificador: dos cosas relacionadas que se hacen en un commit:
  (a) actualizar `.github/workflows/ci.yml::webui` para validar el
  stack actual; (b) borrar el vanilla viejo de manager/dist + gitignore
  y dejar manager/dist/README.md como instrucción para devs locales.
Arquitecto: APPROVE — el job webui original era falso-OK; este
  refleja la realidad post-ADR 0053. `make manager-build` o
  `docker build` regeneran manager/dist desde manager-src.
Ingeniero: .github/workflows/ci.yml (job webui pasa de node --check
  a `npm ci + npm run build + sanity check del dist/index.html con
  <div id="root">`); manager/dist/README.md (nuevo, explica que el
  directorio se genera por build); .gitignore (manager/dist/index.html
  y manager/dist/assets/); rm -r del vanilla viejo (28 archivos).
Verificador: PASS — `cd manager-src && npm ci && npm run build`
  ejecutado localmente simula el job. Output: dist/index.html con
  <div id="root">, dist/assets/ con los chunks lazy del code
  splitting de la corrida 3. Sanity check con grep / test -f / -d
  PASS los 3.
Integración: PASS — Dockerfile no toca; sigue construyendo el SPA
  dentro del stage `frontend-builder`.
Iteraciones: 1/3 (sin fixes).
Escalación: none
Cierre: 2026-05-29 (SHA al push)
