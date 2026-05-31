#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/thierrygrunig/Projects/Monitoring F7"
REMOTE_URL="${1:-https://github.com/Sdisnv/monitoringF7.git}"
BRANCH="${2:-main}"

cd "$ROOT_DIR"

echo "== Monitoring F7: connexion GitHub Sdisnv/monitoringF7 =="
echo "Dossier local : $ROOT_DIR"
echo "Remote GitHub : $REMOTE_URL"
echo "Branche cible : $BRANCH"

if ! command -v git >/dev/null 2>&1; then
  echo "ERREUR: git n'est pas disponible dans Terminal."
  exit 1
fi

if [[ ! -d ".git" ]]; then
  echo "-- Initialisation Git locale"
  git init
fi

git branch -M "$BRANCH"

if git remote get-url origin >/dev/null 2>&1; then
  CURRENT_REMOTE="$(git remote get-url origin)"
  if [[ "$CURRENT_REMOTE" != "$REMOTE_URL" ]]; then
    echo "-- Mise a jour du remote origin"
    git remote set-url origin "$REMOTE_URL"
  else
    echo "-- Remote origin deja configure"
  fi
else
  echo "-- Ajout du remote origin"
  git remote add origin "$REMOTE_URL"
fi

echo "-- Remote configure"
git remote -v

echo
echo "IMPORTANT:"
echo "Si le depot GitHub contient deja des fichiers, lance d'abord:"
echo "  git pull origin $BRANCH --allow-unrelated-histories"
echo
echo "Ensuite, pour publier:"
echo "  ./scripts/update-sdisnv-netlify.sh \"Release Monitoring F7 v65\""
