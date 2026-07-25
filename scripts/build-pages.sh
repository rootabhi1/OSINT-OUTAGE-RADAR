#!/usr/bin/env bash
# Static export (GitHub Pages) can't ship a dynamic API route, since there's
# no server to run it on. This script moves src/app/api out of the way,
# builds a static export, then always restores it — so the working tree is
# never left without its API route, and `npm run dev` / `npm run build`
# (Render's build) are unaffected.
set -euo pipefail

cd "$(dirname "$0")/.."

APP_API="src/app/api"
STASH="src/_api_stash"

restore() {
  if [ -d "$STASH" ]; then
    rm -rf "$APP_API"
    mv "$STASH" "$APP_API"
  fi
}
trap restore EXIT

if [ -d "$APP_API" ]; then
  mv "$APP_API" "$STASH"
fi

GITHUB_PAGES=true npx next build
