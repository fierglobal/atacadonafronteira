#!/usr/bin/env bash
# safe-deploy.sh — aborta o deploy se nada mudou desde o último deploy de produção
# (evita queimar Build CPU Minutes redeployando o mesmo código à toa)
set -euo pipefail
cd "$(dirname "$0")/.."

MARKER=".vercel-last-deploy-hash"
HEAD_SHA=$(git rev-parse HEAD)
DIFF_HASH=$(git diff HEAD -- . ':!node_modules' 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
UNTRACKED=$(git status --porcelain --untracked-files=all | grep '^??' | sort || true)
CURRENT_HASH=$(printf '%s\n%s\n%s' "$HEAD_SHA" "$DIFF_HASH" "$UNTRACKED" | shasum -a 256 | cut -d' ' -f1)

if [ -f "$MARKER" ] && [ "$(cat "$MARKER")" = "$CURRENT_HASH" ] && [ "${FORCE_DEPLOY:-0}" != "1" ]; then
  echo "safe-deploy: abortado — nada mudou desde o último deploy de produção (mesmo commit + mesmo diff)."
  echo "safe-deploy: use FORCE_DEPLOY=1 ./scripts/safe-deploy.sh pra forçar mesmo assim."
  exit 1
fi

vercel --prod "$@"
echo "$CURRENT_HASH" > "$MARKER"
