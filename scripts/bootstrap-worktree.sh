#!/usr/bin/env bash
# bootstrap-worktree.sh — prepara um novo git worktree pra buildar de verdade:
# copia os arquivos não versionados que o build precisa (.env.local, .dev.vars,
# .vercel/project.json) a partir do worktree principal, depois roda npm ci.
set -euo pipefail

MAIN_WORKTREE="/Users/fierglobal/projetos/atacadonafronteira"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  echo "uso: bootstrap-worktree.sh <caminho-do-worktree>"
  exit 1
fi
if [ ! -d "$TARGET" ]; then
  echo "bootstrap-worktree: caminho não existe: $TARGET"
  exit 1
fi
if [ "$TARGET" = "$MAIN_WORKTREE" ]; then
  echo "bootstrap-worktree: não roda no worktree principal, só em worktrees novos"
  exit 1
fi

cp "$MAIN_WORKTREE/.env.local" "$TARGET/.env.local"
cp "$MAIN_WORKTREE/.dev.vars" "$TARGET/.dev.vars"
mkdir -p "$TARGET/.vercel"
cp "$MAIN_WORKTREE/.vercel/project.json" "$TARGET/.vercel/project.json"

cd "$TARGET"
npm ci

echo "bootstrap-worktree: ok — $TARGET"
