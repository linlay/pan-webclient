#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.release.yml"
MOUNTS_FILE="$SCRIPT_DIR/.runtime/docker-compose.mounts.yml"

die() { echo "[stop] $*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "docker is required"
docker compose version >/dev/null 2>&1 || die "docker compose v2 is required"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

PAN_VERSION="${PAN_VERSION:-latest}"
export PAN_VERSION

if [[ ! -f "$MOUNTS_FILE" ]]; then
  mkdir -p "$SCRIPT_DIR/.runtime"
  printf 'services: {}\n' >"$MOUNTS_FILE"
fi

docker compose -f "$COMPOSE_FILE" -f "$MOUNTS_FILE" down --remove-orphans

echo "[stop] stopped pan-webclient $PAN_VERSION"
