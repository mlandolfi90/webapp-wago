# UPSTREAM.md — Runbook de sincronización con upstream

Cómo alimentarnos de las mejoras de la librería original y de Evolution
**sin perder lo nuestro**. Estrategia y porqués: `docs/adr/0036`.

## Mapa de fuentes

| Qué | Origen | Dónde vive acá |
|---|---|---|
| **Submódulo en uso** | **`github.com/mlandolfi90/whatsmeow` rama `wago-patches`** | `whatsmeow-lib/` (vía `replace` en `go.mod`); commit fijado `0923702` |
| Upstream original | `github.com/tulir/whatsmeow` | remote `tulir` del submódulo (fuente de fixes de protocolo) |
| Upstream Evolution | `github.com/EvolutionAPI/whatsmeow` | remote `evolutionapi` del submódulo (mejoras de Evolution, ej. LID) |
| Linaje del backend | `github.com/EvolutionAPI/evolution-go` | este repo (derivado; ver `NOTICE`) |

> Estado: el submódulo YA apunta al fork propio (ADR 0042). Sync = traer
> `tulir` **y** `evolutionapi` a `wago-patches` y rebasar los parches
> propios (procedimiento abajo). Ambos upstreams se alimentan.

## Dos reglas que lo hacen barato (de ADR 0036)

1. **Código aditivo, no in-place.** Features propias = archivos nuevos.
   No reescribir archivos upstream (cada línea tocada = costo de rebase).
2. **Divergencia documentada.** Cada parche: commit `wago-patch: ...`
   + entrada en `NOTICE` (backend) o ADR (lib). Sin registro, se pierde
   en el próximo sync.

## A. Sync de la librería (submódulo whatsmeow)

> Hacerlo en una **corrida de El Crisol** (toca dependencia/build).

```bash
# 1. Inicializar submódulo si hace falta
git submodule update --init --recursive

cd whatsmeow-lib
# 2. Remotes de las dos fuentes (idempotente)
git remote add tulir       https://github.com/tulir/whatsmeow.git        2>/dev/null || true
git remote add evolutionapi https://github.com/EvolutionAPI/whatsmeow.git 2>/dev/null || true
git fetch --all --tags

# 3. Ver qué hay de nuevo (foco: fixes de protocolo)
git log --oneline HEAD..tulir/main        | head -40
git log --oneline HEAD..evolutionapi/main | head -40

# 4. Rebasar NUESTROS parches sobre la base nueva
#    (los parches viven en la rama wago-patches del fork propio;
#     ver "Bootstrap del fork" más abajo si aún no existe)
git checkout wago-patches
git rebase tulir/main          # o evolutionapi/main según la base elegida
#    Resolver conflictos SOLO en superficies que tocamos (deberían ser
#    pocas si se respetó la regla #1). Cada parche debe seguir aislado.

cd ..
# 5. Apuntar el submódulo al nuevo commit de wago-patches
git add whatsmeow-lib
```

Validación (Verificador del Crisol):

```bash
go build ./...            # compila con la lib nueva
go test ./internal/...    # suite MCP verde
go vet ./...
# Cambios de PROTOCOLO (p.ej. álbum, receipts): validación contra un
# WhatsApp REAL es obligatoria. El sync PROPONE; humano + Crisol DISPONEN.
```

Cierre: ADR que registre "subimos whatsmeow de `<old>` a `<new>`,
parches re-aplicados: <lista>", + bump del submódulo commiteado.

## B. Sync del backend (evolution-go)

No se rebasa (ya divergimos). Se hace **cherry-pick deliberado**:

```bash
git remote add evogo https://github.com/EvolutionAPI/evolution-go.git 2>/dev/null || true
git fetch evogo
git log --oneline <último-sync>..evogo/main   # revisar a mano
# Portar solo lo importante, por Crisol, y anotar en NOTICE.
```

## Bootstrap del fork propio (una sola vez, su corrida de Crisol)

1. Fork de `EvolutionAPI/whatsmeow` (o de `tulir/whatsmeow`) a la cuenta
   propia → `mlandolfi90/whatsmeow`.
2. Rama `wago-patches` a partir de la base elegida; mover ahí los
   parches propios como commits `wago-patch:` chicos y aislados.
3. Cambiar la URL del submódulo en `.gitmodules` al fork propio y fijar
   el commit de `wago-patches`.
4. ADR registrando el cambio de origen del submódulo.

> Nota de entorno: el acceso GitHub de este asistente está restringido a
> `mlandolfi90/webapp-wago`; crear el fork y configurar remotes externos
> es acción del humano (o de una sesión con scope ampliado).

## Cadencia sugerida

- **Mensual** o ante un fix de protocolo relevante anunciado upstream.
- Cada sync = 1 corrida de Crisol + 1 ADR de cierre. Si un cambio de
  protocolo no se puede validar contra dispositivo, **no se baja**: se
  deja anotado como pendiente (como el álbum).
