#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/thierrygrunig/Projects/Monitoring F7"
cd "$ROOT_DIR"

echo "== Monitoring F7: statut workflow =="
echo "Dossier: $ROOT_DIR"

if [[ -d ".git" ]]; then
  echo "-- Git"
  git status --short --branch
  echo "-- Remote"
  git remote -v
else
  echo "-- Git: non initialise"
fi

echo "-- Version active"
grep -n "Monitoring F7 v" index.html | head -1
grep -n "version: 'v" assets/js/config.js | head -1

echo "-- Controle local"
./scripts/check-local.sh
