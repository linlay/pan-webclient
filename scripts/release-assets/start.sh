#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.release.yml"
MOUNTS_FILE="$SCRIPT_DIR/.runtime/docker-compose.mounts.yml"
IMAGES_DIR="$SCRIPT_DIR/images"

die() { echo "[start] $*" >&2; exit 1; }

[[ -f "$ENV_FILE" ]] || die "missing .env (copy from .env.example first)"
[[ -f "$SCRIPT_DIR/configs/local-public-key.pem" ]] || die "missing configs/local-public-key.pem"

command -v docker >/dev/null 2>&1 || die "docker is required"
docker compose version >/dev/null 2>&1 || die "docker compose v2 is required"

set -a
. "$ENV_FILE"
set +a

PAN_VERSION="${PAN_VERSION:-latest}"
API_IMAGE="pan-webclient-backend:$PAN_VERSION"
FRONTEND_IMAGE="pan-webclient-frontend:$PAN_VERSION"

# 按需加载镜像
load_image() {
  local ref="$1" tar="$2"
  if docker image inspect "$ref" >/dev/null 2>&1; then return 0; fi
  [[ -f "$tar" ]] || die "missing image tar: $tar"
  docker load -i "$tar" >/dev/null
  docker image inspect "$ref" >/dev/null 2>&1 || die "failed to load image: $ref"
}

load_image "$API_IMAGE"      "$IMAGES_DIR/pan-webclient-backend.tar"
load_image "$FRONTEND_IMAGE" "$IMAGES_DIR/pan-webclient-frontend.tar"

# 生成挂载 compose 文件
mkdir -p "$SCRIPT_DIR/.runtime" "$SCRIPT_DIR/data" "$SCRIPT_DIR/configs/mounts"

docker run --rm \
  -v "$SCRIPT_DIR/configs:/app/configs:ro" \
  -v "$SCRIPT_DIR/.runtime:/output" \
  "$API_IMAGE" \
  /app/composemounts -output /output/docker-compose.mounts.yml

export PAN_VERSION
docker compose -f "$COMPOSE_FILE" -f "$MOUNTS_FILE" up -d

echo "[start] started pan-webclient $PAN_VERSION"
echo "[start] browser: http://127.0.0.1:${NGINX_PORT:-11946}/pan/"
