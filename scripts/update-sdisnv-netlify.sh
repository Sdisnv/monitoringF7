#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/thierrygrunig/Projects/Monitoring F7"
MESSAGE="${1:-Mise a jour Monitoring F7}"
BRANCH="${2:-main}"

cd "$ROOT_DIR"

echo "== Monitoring F7: mise a jour GitHub -> Netlify =="

if [[ ! -d ".git" ]]; then
  echo "ERREUR: ce dossier n'est pas encore connecte a Git."
  echo "Lance d'abord:"
  echo "  ./scripts/setup-github-sdisnv.sh"
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "ERREUR: remote origin absent."
  echo "Lance:"
  echo "  ./scripts/setup-github-sdisnv.sh"
  exit 1
fi

REMOTE="$(git remote get-url origin)"
case "$REMOTE" in
  *github.com/Sdisnv/monitoringF7.git|*github.com:Sdisnv/monitoringF7.git)
    ;;
  *)
    echo "ERREUR: remote origin inattendu: $REMOTE"
    echo "Attendu: https://github.com/Sdisnv/monitoringF7.git"
    exit 1
    ;;
esac

./scripts/check-local.sh

echo "-- Branche"
git branch -M "$BRANCH"

echo "-- Etat avant commit"
git status --short

echo "-- Ajout fichiers applicatifs"
git add .gitignore index.html README.md netlify.toml assets docs netlify scripts

if git diff --cached --quiet; then
  echo "Aucun changement a committer."
else
  git commit -m "$MESSAGE"
fi

echo "-- Push vers GitHub"
git push -u origin "$BRANCH"

echo "OK: push termine."
echo "Netlify doit maintenant lancer un deploy automatique depuis GitHub."
