#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck disable=SC1091
. "$SCRIPT_DIR/release-common.sh"

resolve_release_context
require_image_release_tools
command -v gzip >/dev/null 2>&1 || die "gzip is required"

IMAGE_BUNDLE="$RELEASE_DIR/${APP_NAME}-image-${VERSION}-linux-${ARCH}.tar.gz"

echo "[release] image VERSION=$VERSION ARCH=$ARCH PLATFORM=$PLATFORM"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pan-release-image.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

BACKEND_TAR="$TMP_DIR/${API_IMAGE_REPOSITORY}.tar"
FRONTEND_TAR="$TMP_DIR/${FRONTEND_IMAGE_REPOSITORY}.tar"

build_backend_image_to_tar "$BACKEND_TAR"
build_frontend_image_to_tar "$FRONTEND_TAR"

echo "[release] loading release images into local docker image store..."
docker load -i "$BACKEND_TAR" >/dev/null
docker load -i "$FRONTEND_TAR" >/dev/null

mkdir -p "$RELEASE_DIR"
docker save "$API_IMAGE" "$FRONTEND_IMAGE" | gzip -c >"$IMAGE_BUNDLE"

echo "[release] done: $IMAGE_BUNDLE"
