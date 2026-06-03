#!/usr/bin/env bash
# brujula-lucky — ancla la sesión al estado REAL del repo y el deploy.
# REGLA DE ORO: si una fuente no se puede leer → "N/D". JAMÁS inferir.
# Solo lectura. No modifica nada.
set -uo pipefail
ND="N/D"

line(){ printf '%s\n' "────────────────────────────────"; }

# ── 1. REPO ───────────────────────────────────────────────
BRANCH="$ND"; STATUS_N="$ND"; AHEAD="$ND"; BEHIND="$ND"; EXPECTED="$ND"; FLAG=""
if git rev-parse --git-dir >/dev/null 2>&1; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "$ND")"
  STATUS_N="$(git status --short 2>/dev/null | wc -l | tr -d ' ')"
  if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
    AHEAD="$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo "$ND")"
    BEHIND="$(git rev-list --count 'HEAD..@{u}' 2>/dev/null || echo "$ND")"
  else AHEAD="sin-remote"; BEHIND="sin-remote"; fi
  # branch de trabajo más reciente (excluye main/master)
  EXPECTED="$(git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/heads 2>/dev/null \
              | grep -Ev '^(main|master)$' | head -1 || true)"
  [ -z "$EXPECTED" ] && EXPECTED="$ND"
  # el RUN-LEDGER ACTIVE manda sobre la heurística
  LEDGER="docs/refactor/_crisol/RUN-LEDGER.md"
  if [ -f "$LEDGER" ]; then
    LB="$(awk '/^### /{e=$0} /^- STATUS:/{s=$0} s ~ /ACTIVE/ && e!=""{ for(i=1;i<=NF;i++) if($i=="—"||$i=="-"){print $(i+1); exit} }' "$LEDGER" 2>/dev/null || true)"
    [ -n "$LB" ] && EXPECTED="$LB (ledger ACTIVE)"
  fi
  # banderas duras
  case "$BRANCH" in
    main|master) FLAG="⚠️  Estás en '$BRANCH' (rama protegida) — ¿seguro?";;
    HEAD) FLAG="⚠️  detached HEAD — no estás en ninguna rama.";;
  esac
  EXP_BARE="${EXPECTED%% *}"
  if [ "$EXPECTED" != "$ND" ] && [ "$BRANCH" != "$EXP_BARE" ]; then
    FLAG="🚨 BRANCH INESPERADO: estás en '$BRANCH', el trabajo más reciente está en '$EXPECTED'."
  fi
fi

# ── 2. DEPLOY ─────────────────────────────────────────────
DOCKER="$ND"; COMPOSE="$ND"
if command -v docker >/dev/null 2>&1; then
  DOCKER="$(docker ps --format '{{.Names}} ({{.Status}})' 2>/dev/null | paste -sd', ' - || echo "$ND")"
  [ -z "$DOCKER" ] && DOCKER="ninguno arriba"
  if ls docker-compose.y*ml compose.y*ml >/dev/null 2>&1; then
    COMPOSE="$(docker compose ps --format '{{.Name}} {{.Status}}' 2>/dev/null | paste -sd', ' - || echo "$ND")"
    [ -z "$COMPOSE" ] && COMPOSE="ninguno arriba"
  else COMPOSE="sin compose en repo"; fi
fi

# ── 3. DECISIONES ─────────────────────────────────────────
ADR="$ND"; CRISOL="$ND"
if ls docs/decisions/*.md >/dev/null 2>&1; then
  ADR="$(ls -1 docs/decisions/*.md 2>/dev/null | sort | tail -1 | xargs -r basename || echo "$ND")"
fi
if [ -f "docs/refactor/_crisol/RUN-LEDGER.md" ]; then
  CRISOL="$(grep -m1 'STATUS: ACTIVE' docs/refactor/_crisol/RUN-LEDGER.md >/dev/null 2>&1 && echo "activo" || echo "ninguno activo")"
fi

# ── SNAPSHOT ──────────────────────────────────────────────
[ -n "$FLAG" ] && { echo "$FLAG"; line; }
echo "📍 BRÚJULA — estás acá:"
echo "  Repo     : branch '$BRANCH' · $STATUS_N archivo(s) sin commitear · ↑$AHEAD ↓$BEHIND vs remote"
echo "  Esperado : $EXPECTED"
echo "  Deploy   : docker → $DOCKER"
echo "             compose → $COMPOSE"
echo "  Decisión : último ADR → $ADR · Crisol → $CRISOL"
line
echo "(N/D = no se pudo leer esa fuente; NO se infiere)"
