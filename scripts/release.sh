#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RELEASE_ASSETS_DIR="$SCRIPT_DIR/release-assets"

die() { echo "[release] $*" >&2; exit 1; }

# ── 参数 ──────────────────────────────────────────────────────
VERSION="${VERSION:-$(cat "$REPO_ROOT/VERSION" 2>/dev/null || echo "dev")}"
[[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "VERSION must match vX.Y.Z (got: $VERSION)"

if [[ -z "${ARCH:-}" ]]; then
  case "$(uname -m)" in
    x86_64|amd64)   ARCH=amd64 ;;
    arm64|aarch64)  ARCH=arm64 ;;
    *) die "cannot detect ARCH from $(uname -m); pass ARCH=amd64|arm64" ;;
  esac
fi

PLATFORM="linux/$ARCH"
API_IMAGE="pan-webclient-backend:$VERSION"
FRONTEND_IMAGE="pan-webclient-frontend:$VERSION"
BUNDLE_NAME="pan-webclient-${VERSION}-linux-${ARCH}"
BUNDLE_TAR="$REPO_ROOT/dist/release/${BUNDLE_NAME}.tar.gz"

echo "[release] VERSION=$VERSION  ARCH=$ARCH  PLATFORM=$PLATFORM"

# ── 构建镜像 ──────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || die "docker is required"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pan-release.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

IMAGES_DIR="$TMP_DIR/images"
mkdir -p "$IMAGES_DIR"

echo "[release] building backend image..."
docker buildx build \
  --platform "$PLATFORM" \
  --file "$REPO_ROOT/backend/Dockerfile" \
  --tag "$API_IMAGE" \
  --output "type=docker,dest=$IMAGES_DIR/pan-webclient-backend.tar" \
  "$REPO_ROOT"

echo "[release] building frontend image..."
docker buildx build \
  --platform "$PLATFORM" \
  --file "$REPO_ROOT/frontend/Dockerfile" \
  --tag "$FRONTEND_IMAGE" \
  --output "type=docker,dest=$IMAGES_DIR/pan-webclient-frontend.tar" \
  "$REPO_ROOT"

# ── 组装 bundle ───────────────────────────────────────────────
BUNDLE_ROOT="$TMP_DIR/pan-webclient"
mkdir -p \
  "$BUNDLE_ROOT/configs/mounts" \
  "$BUNDLE_ROOT/data" \
  "$BUNDLE_ROOT/images"

cp "$RELEASE_ASSETS_DIR/compose.release.yml" "$BUNDLE_ROOT/compose.release.yml"
cp "$RELEASE_ASSETS_DIR/start.sh"                   "$BUNDLE_ROOT/start.sh"
cp "$RELEASE_ASSETS_DIR/stop.sh"                    "$BUNDLE_ROOT/stop.sh"
cp "$RELEASE_ASSETS_DIR/README.txt"                 "$BUNDLE_ROOT/README.txt"
cp "$REPO_ROOT/.env.example"                       "$BUNDLE_ROOT/.env.example"
cp "$REPO_ROOT/configs/local-public-key.example.pem" "$BUNDLE_ROOT/configs/local-public-key.example.pem"

find "$REPO_ROOT/configs/mounts" -maxdepth 1 -type f -name '*.example.json' \
  -exec cp {} "$BUNDLE_ROOT/configs/mounts/" \;

cp "$IMAGES_DIR/pan-webclient-backend.tar"  "$BUNDLE_ROOT/images/"
cp "$IMAGES_DIR/pan-webclient-frontend.tar" "$BUNDLE_ROOT/images/"

# 写入版本到 .env.example 的 PAN_VERSION
sed -i.bak "s/^PAN_VERSION=.*/PAN_VERSION=$VERSION/" "$BUNDLE_ROOT/.env.example" && rm -f "$BUNDLE_ROOT/.env.example.bak"

chmod +x "$BUNDLE_ROOT/start.sh" "$BUNDLE_ROOT/stop.sh"

# ── 打包 ──────────────────────────────────────────────────────
mkdir -p "$(dirname "$BUNDLE_TAR")"
tar -czf "$BUNDLE_TAR" -C "$TMP_DIR" pan-webclient

echo "[release] done: $BUNDLE_TAR"
