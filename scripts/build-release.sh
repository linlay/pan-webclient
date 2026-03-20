#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

. "$SCRIPT_DIR/release-common.sh"

require_version
require_arch
require_cmd docker
require_cmd go

warn_if_cross_build "$ARCH"

platform="$(platform_for_arch "$ARCH")"
goarch="$(goarch_for_arch "$ARCH")"
build_dir="$(build_dir_for "$VERSION" "$ARCH")"
images_dir="$build_dir/images"
bin_dir="$build_dir/bin"
manifest_file="$build_dir/release-manifest.env"

mkdir -p "$images_dir" "$bin_dir"

api_image="$(api_image_ref_for "$VERSION" "$ARCH")"
frontend_image="$(frontend_image_ref_for "$VERSION" "$ARCH")"

docker buildx build \
  --platform "$platform" \
  --file backend/Dockerfile \
  --tag "$api_image" \
  --output "type=docker,dest=$images_dir/${API_IMAGE_NAME}.tar" \
  .

docker buildx build \
  --platform "$platform" \
  --file frontend/Dockerfile \
  --tag "$frontend_image" \
  --output "type=docker,dest=$images_dir/${FRONTEND_IMAGE_NAME}.tar" \
  .

(
  cd "$REPO_ROOT/backend"
  CGO_ENABLED=0 GOOS=linux GOARCH="$goarch" go build -o "$bin_dir/composemounts" ./cmd/composemounts
)

cat >"$manifest_file" <<EOF
REPO_NAME=$REPO_NAME
VERSION=$VERSION
ARCH=$ARCH
PLATFORM=$platform
API_IMAGE_NAME=$API_IMAGE_NAME
FRONTEND_IMAGE_NAME=$FRONTEND_IMAGE_NAME
API_IMAGE=$api_image
FRONTEND_IMAGE=$frontend_image
EOF

echo "[release] built artifacts under $build_dir"
