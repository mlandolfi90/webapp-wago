# 0036 - Estrategia de upstreaming (alimentarse sin acoplarse)

- Estado: aceptado
- Fecha: 2026-05-17
- Tipo: ADR de estrategia (documentación; no dispara El Crisol — no hay
  mutación código→commit. Registrado en RUN-LEDGER para trazabilidad.)

## Contexto y problema

El proyecto divergió de Evolution Go y usa un fork de whatsmeow como
submódulo. Se quiere **seguir recibiendo** mejoras importantes de:

- `tulir/whatsmeow` — la librería **original** (fixes de protocolo).
- `EvolutionAPI/whatsmeow` — el fork actual del submódulo
  (`whatsmeow-lib/`, hoy en `0923702`, un merge de `tulir:main`).
- `EvolutionAPI/evolution-go` — el linaje del backend (de ahí deriva
  webapp-wago; ver `NOTICE`).

…manteniendo features propias futuras (p.ej. envío de álbum) sin que
cada actualización upstream sea una pesadilla de merge.

## Decisión

Adoptar el modelo **"base sincronizable + parches propios como capa
aparte, rebasable"**, con dos reglas que lo hacen barato de mantener:

1. **REGLA DE BAJO MANTENIMIENTO #1 — código aditivo, no in-place.**
   Toda feature propia sobre whatsmeow se agrega como **archivos
   nuevos** (o, si es inevitable tocar upstream, en el menor número de
   líneas y aislado), nunca reescribiendo archivos upstream. Cuanto
   menos tocamos lo de ellos, más barato el rebase.
2. **REGLA DE BAJO MANTENIMIENTO #2 — divergencia documentada.**
   Cada parche propio se registra (commit etiquetado `wago-patch:` +
   entrada en `NOTICE`/ADR). Si no está documentado, no existe: se
   pierde en el próximo sync.

Estructura objetivo (cuando se implemente, su corrida de Crisol):

- Fork propio del submódulo con remotes `tulir` y `evolutionapi`.
- Rama `wago-patches` con commits chicos y aislados; el submódulo de
  webapp-wago apunta a un commit de esa rama.
- Sync = ritual repetible documentado en `docs/UPSTREAM.md`.
- Backend (evolution-go): **no rebase**, cherry-pick deliberado de
  cambios importantes, por Crisol, registrado en `NOTICE`.

## Alternativas consideradas

- **Mergear upstream hacia adentro** (en vez de rebasar parches):
  más barato por vez pero ensucia qué es nuestro; insostenible en
  divergencia larga. Descartado como modelo primario.
- **Vendorizar y olvidarse de upstream**: descartado; el pedido
  explícito es no quedarse sin fixes de protocolo.
- **Auto-merge de upstream vía CI**: descartado para cambios de
  protocolo; requieren validación contra dispositivo real (álbum es el
  caso testigo). El sync propone, un humano + Crisol disponen.

## Consecuencias

- Positivas: divergencia visible y auditable; rebases baratos si se
  respetan las dos reglas; fixes críticos de la lib siguen llegando;
  cero acoplamiento nuevo.
- Negativas: el sync es un ritual periódico (no gratis); requiere
  disciplina de "código aditivo".
- Operativo: el procedimiento exacto vive en `docs/UPSTREAM.md`
  (runbook). La creación del fork/remotes y cualquier automatización son
  pasos posteriores, cada uno su corrida de Crisol.
