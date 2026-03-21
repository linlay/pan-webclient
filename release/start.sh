#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_FILE="$SCRIPT_DIR/release-manifest.env"
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.release.yml"
MOUNTS_FILE="$SCRIPT_DIR/.runtime/docker-compose.mounts.yml"
COMPOSEMOUNTS_BIN="$SCRIPT_DIR/bin/composemounts"
IMAGES_DIR="$SCRIPT_DIR/images"

die() {
  echo "[start] $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

require_docker_compose() {
  docker compose version >/dev/null 2>&1 || die "docker compose v2 is required"
}

ensure_image_loaded() {
  local image_ref="$1"
  local image_tar="$2"
  if docker image inspect "$image_ref" >/dev/null 2>&1; then
    return 0
  fi
  [[ -f "$image_tar" ]] || die "missing image tar: $image_tar"
  docker load -i "$image_tar" >/dev/null
  docker image inspect "$image_ref" >/dev/null 2>&1 || die "failed to load image: $image_ref"
}

[[ -f "$MANIFEST_FILE" ]] || die "missing bundle manifest: $MANIFEST_FILE"
[[ -f "$ENV_FILE" ]] || die "missing .env (copy from .env.example first)"
[[ -x "$COMPOSEMOUNTS_BIN" ]] || die "missing compose mount helper: $COMPOSEMOUNTS_BIN"
[[ -f "$SCRIPT_DIR/configs/local-public-key.pem" ]] || die "missing configs/local-public-key.pem"

require_cmd docker
require_docker_compose

set -a
. "$MANIFEST_FILE"
set +a

set -a
. "$ENV_FILE"
set +a

ensure_image_loaded "$API_IMAGE" "$IMAGES_DIR/${API_IMAGE_NAME:-pan-webclient-backend}.tar"
ensure_image_loaded "$FRONTEND_IMAGE" "$IMAGES_DIR/${FRONTEND_IMAGE_NAME:-pan-webclient-frontend}.tar"

mkdir -p "$SCRIPT_DIR/.runtime" "$SCRIPT_DIR/data" "$SCRIPT_DIR/configs/mounts"

(
  cd "$SCRIPT_DIR"
  "$COMPOSEMOUNTS_BIN" -output "$MOUNTS_FILE"
)

export API_IMAGE FRONTEND_IMAGE
docker compose -f "$COMPOSE_FILE" -f "$MOUNTS_FILE" up -d

echo "[start] started pan-webclient $VERSION"
echo "[start] browser: http://127.0.0.1:${NGINX_PORT:-11946}/pan/"
