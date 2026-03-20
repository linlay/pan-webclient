#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_FILE="$SCRIPT_DIR/release-manifest.env"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.release.yml"
MOUNTS_FILE="$SCRIPT_DIR/.runtime/docker-compose.mounts.yml"
COMPOSEMOUNTS_BIN="$SCRIPT_DIR/bin/composemounts"

die() {
  echo "[stop] $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

require_docker_compose() {
  docker compose version >/dev/null 2>&1 || die "docker compose v2 is required"
}

[[ -f "$MANIFEST_FILE" ]] || die "missing bundle manifest: $MANIFEST_FILE"

require_cmd docker
require_docker_compose

set -a
. "$MANIFEST_FILE"
set +a

mkdir -p "$SCRIPT_DIR/.runtime"

if [[ -x "$COMPOSEMOUNTS_BIN" ]]; then
  (
    cd "$SCRIPT_DIR"
    "$COMPOSEMOUNTS_BIN" -output "$MOUNTS_FILE"
  )
elif [[ ! -f "$MOUNTS_FILE" ]]; then
  printf 'services: {}\n' >"$MOUNTS_FILE"
fi

export API_IMAGE FRONTEND_IMAGE
docker compose -f "$COMPOSE_FILE" -f "$MOUNTS_FILE" down --remove-orphans

echo "[stop] stopped pan-webclient ${VERSION:-unknown}"
