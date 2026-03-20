#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

. "$SCRIPT_DIR/release-common.sh"

require_version
require_arch
require_cmd tar
require_cmd shasum

"$SCRIPT_DIR/build-release.sh"

build_dir="$(build_dir_for "$VERSION" "$ARCH")"
bundle_path="$(bundle_path_for "$VERSION" "$ARCH")"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/pan-webclient-release.XXXXXX")"
bundle_root="$tmp_dir/$REPO_NAME"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

mkdir -p \
  "$bundle_root/bin" \
  "$bundle_root/configs/mounts" \
  "$bundle_root/data" \
  "$bundle_root/images"

cp "$REPO_ROOT/release/docker-compose.release.yml" "$bundle_root/docker-compose.release.yml"
cp "$REPO_ROOT/release/start.sh" "$bundle_root/start.sh"
cp "$REPO_ROOT/release/stop.sh" "$bundle_root/stop.sh"
cp "$REPO_ROOT/.env.example" "$bundle_root/.env.example"
cp "$REPO_ROOT/configs/local-public-key.example.pem" "$bundle_root/configs/local-public-key.example.pem"
cp "$build_dir/release-manifest.env" "$bundle_root/release-manifest.env"
cp "$build_dir/bin/composemounts" "$bundle_root/bin/composemounts"
cp "$build_dir/images/${API_IMAGE_NAME}.tar" "$bundle_root/images/${API_IMAGE_NAME}.tar"
cp "$build_dir/images/${FRONTEND_IMAGE_NAME}.tar" "$bundle_root/images/${FRONTEND_IMAGE_NAME}.tar"

find "$REPO_ROOT/configs/mounts" -maxdepth 1 -type f -name '*.example.json' -exec cp {} "$bundle_root/configs/mounts/" \;

chmod +x \
  "$bundle_root/bin/composemounts" \
  "$bundle_root/start.sh" \
  "$bundle_root/stop.sh"

cat >"$bundle_root/RELEASE_NOTES.txt" <<EOF
$REPO_NAME $VERSION
Architecture: $ARCH

This bundle is intended for manual upload and manual deployment.

Deploy steps:
1. Copy .env.example to .env and fill in real values.
2. Copy configs/local-public-key.example.pem to configs/local-public-key.pem.
3. If needed, copy configs/mounts/*.example.json to *.json and adjust source/path.
4. Run ./start.sh
5. Use ./stop.sh to stop the stack

Manual upload targets:
- GitHub Release: upload ${REPO_NAME}-${VERSION}-linux-${ARCH}.tar.gz
- Your own server: upload to ${REPO_NAME}/${VERSION}/
EOF

(
  cd "$bundle_root"
  find . -type f ! -name checksums.txt | sort | while read -r file; do
    rel="${file#./}"
    printf '%s  %s\n' "$(sha256_file "$rel")" "$rel"
  done > checksums.txt
)

mkdir -p "$(dirname "$bundle_path")"
tar -czf "$bundle_path" -C "$tmp_dir" "$REPO_NAME"

echo "[release] packaged $bundle_path"
