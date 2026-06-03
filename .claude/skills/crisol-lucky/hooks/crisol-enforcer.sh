#!/usr/bin/env bash
# crisol-enforcer — PreToolUse hook (Edit|Write|MultiEdit)
# DURO: bloquea cambios de CÓDIGO sin entrada STATUS: ACTIVE en el ledger.
# OBJETIVO: regla binaria, sin criterio humano. Exit 2 = bloquea y avisa a Claude.
set -euo pipefail

LEDGER="docs/refactor/_crisol/RUN-LEDGER.md"

# 1. Ruta del archivo que se quiere tocar (viene en el JSON del hook por stdin)
INPUT="$(cat)"
FILE="$(printf '%s' "$INPUT" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')"
[ -z "$FILE" ] && exit 0   # sin ruta → no opina

# 2. EXENTOS (no son código→commit): docs, markdown, el propio ledger/templates
case "$FILE" in
  *.md|docs/*|*/docs/*|*.txt) exit 0 ;;
esac

# 3. Branch actual
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
[ -z "$BRANCH" ] && exit 0   # sin git → no aplica

# 4. ¿Hay entrada ACTIVE para ESTE branch? (parseo por bloque ### )
ACTIVE="$(awk -v b="$BRANCH" '
  /^### / { entry=$0; st="" }
  /^- STATUS:/ { st=$0 }
  st ~ /ACTIVE/ && entry ~ b { found=1 }
  END { print (found?"yes":"no") }
' "$LEDGER" 2>/dev/null || echo no)"

if [ "$ACTIVE" != "yes" ]; then
  echo "🚨 CRISOL BLOQUEADO: no hay entrada 'STATUS: ACTIVE' para el branch '$BRANCH' en $LEDGER." >&2
  echo "Abrí una corrida del Crisol (/crisol) antes de tocar código fuente." >&2
  exit 2   # bloquea la tool-call y devuelve este texto a Claude
fi
exit 0
