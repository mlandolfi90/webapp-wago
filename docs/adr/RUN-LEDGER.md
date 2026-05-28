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
