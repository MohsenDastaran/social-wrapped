#!/usr/bin/env bash
# Create the private GitHub repo for app-core and push it.
# Requires: gh auth login
set -euo pipefail

CORE_DIR="$(cd "$(dirname "$0")/../../social-wrapped-core" 2>/dev/null && pwd || true)"
if [[ -z "${CORE_DIR}" || ! -d "${CORE_DIR}/.git" ]]; then
  CORE_DIR="$(cd "$(dirname "$0")/.." && pwd)/../social-wrapped-core"
  CORE_DIR="$(cd "$CORE_DIR" && pwd)"
fi

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO=MohsenDastaran/social-wrapped-core
URL="https://github.com/${REPO}.git"

if ! command -v gh >/dev/null 2>&1; then
  if [[ -x "${APP_DIR}/.tools/gh" ]]; then
    export PATH="${APP_DIR}/.tools:${PATH}"
  else
    echo "Install GitHub CLI (gh) and run: gh auth login" >&2
    exit 1
  fi
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Not logged in. Run: gh auth login" >&2
  exit 1
fi

cd "$CORE_DIR"
if gh repo view "$REPO" >/dev/null 2>&1; then
  echo "Repo ${REPO} already exists — pushing main…"
  git remote remove origin 2>/dev/null || true
  git remote add origin "$URL"
  git push -u origin main
else
  echo "Creating private repo ${REPO}…"
  gh repo create "$REPO" --private --source=. --remote=origin --push
fi

cd "$APP_DIR"
git config -f .gitmodules submodule.core.url "$URL"
git submodule sync
echo "Done. Submodule URL → ${URL}"
echo "Add Actions secret SUBMODULE_TOKEN (PAT with read access to ${REPO}) on social-wrapped."
