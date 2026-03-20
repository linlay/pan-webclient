#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

. "$SCRIPT_DIR/release-common.sh"

require_version
require_arch
require_cmd tar
require_cmd shasum

verify_checksums() {
  local bundle_root="$1"
  while read -r checksum path; do
    [[ -n "$checksum" ]] || continue
    local actual
    actual="$(sha256_file "$bundle_root/$path")"
    [[ "$actual" == "$checksum" ]] || die "checksum mismatch for $path"
  done <"$bundle_root/checksums.txt"
}

bundle_path="$(bundle_path_for "$VERSION" "$ARCH")"
[[ -f "$bundle_path" ]] || die "missing bundle: $bundle_path"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/pan-webclient-check.XXXXXX")"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

tar -xzf "$bundle_path" -C "$tmp_dir"

bundle_root="$tmp_dir/$REPO_NAME"
[[ -d "$bundle_root" ]] || die "bundle root missing in $bundle_path"

for required in \
  ".env.example" \
  "RELEASE_NOTES.txt" \
  "checksums.txt" \
  "docker-compose.release.yml" \
  "release-manifest.env" \
  "start.sh" \
  "stop.sh" \
  "bin/composemounts" \
  "configs/local-public-key.example.pem" \
  "images/${API_IMAGE_NAME}.tar" \
  "images/${FRONTEND_IMAGE_NAME}.tar"; do
  [[ -e "$bundle_root/$required" ]] || die "missing $required in $bundle_path"
done

grep -F "ARCH=$ARCH" "$bundle_root/release-manifest.env" >/dev/null || die "arch mismatch in $bundle_path"
grep -F "API_IMAGE=$(api_image_ref_for "$VERSION" "$ARCH")" "$bundle_root/release-manifest.env" >/dev/null || die "api image tag mismatch in $bundle_path"
grep -F "FRONTEND_IMAGE=$(frontend_image_ref_for "$VERSION" "$ARCH")" "$bundle_root/release-manifest.env" >/dev/null || die "frontend image tag mismatch in $bundle_path"

if grep -Eq '^[[:space:]]+build:' "$bundle_root/docker-compose.release.yml"; then
  die "docker-compose.release.yml must not contain build directives"
fi

verify_checksums "$bundle_root"

echo "[release] verified linux-$ARCH bundle"
