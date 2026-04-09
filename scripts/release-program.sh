#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROGRAM_ASSETS_DIR="$SCRIPT_DIR/release-program-assets"
WINDOWS_RELEASE_SCRIPTS_DIR="$REPO_ROOT/release-scripts/windows"

# shellcheck disable=SC1091
. "$SCRIPT_DIR/release-common.sh"

resolve_release_context
require_program_release_tools

cd "$REPO_ROOT"
build_frontend_dist

build_program_bundle() {
  local target_os="$1"
  local target_arch="$2"
  local binary_name
  local bundle_name
  local bundle_tar
  local tmp_dir
  local bundle_root

  binary_name="$(binary_name_for_os "$target_os")"
  bundle_name="${APP_NAME}-program-${VERSION}-${target_os}-${target_arch}"
  bundle_tar="$RELEASE_DIR/${bundle_name}.tar.gz"

  echo "[release] program VERSION=$VERSION TARGET_OS=$target_os ARCH=$target_arch"

  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/pan-program-release.XXXXXX")"
  trap 'rm -rf "$tmp_dir"' RETURN

  bundle_root="$tmp_dir/$APP_NAME"
  mkdir -p \
    "$bundle_root/configs/mounts" \
    "$bundle_root/frontend"

  echo "[release] building program binary for $target_os..."
  (
    cd "$REPO_ROOT/backend"
    CGO_ENABLED=0 GOOS="$target_os" GOARCH="$target_arch" \
      go build \
      -o "$bundle_root/$binary_name" \
      ./cmd/server
  )

  echo "[release] assembling program bundle for $target_os..."
  cp "$REPO_ROOT/.env.example" "$bundle_root/.env.example"
  cp "$PROGRAM_ASSETS_DIR/README.txt" "$bundle_root/README.txt"
  cp "$REPO_ROOT/plugin-manifest.json" "$bundle_root/plugin-manifest.json"
  cp "$REPO_ROOT/configs/local-public-key.example.pem" "$bundle_root/configs/local-public-key.example.pem"
  find "$REPO_ROOT/configs/mounts" -maxdepth 1 -type f -name '*.example.json' \
    -exec cp {} "$bundle_root/configs/mounts/" \;
  cp -R "$REPO_ROOT/frontend/dist" "$bundle_root/frontend/dist"

  sed -i.bak 's|^FRONTEND_DIST_DIR=.*$|FRONTEND_DIST_DIR=./frontend/dist|' "$bundle_root/.env.example"
  rm -f "$bundle_root/.env.example.bak"

  if [[ "$target_os" == "windows" ]]; then
    mkdir -p "$bundle_root/release-scripts/windows"
    cp "$WINDOWS_RELEASE_SCRIPTS_DIR/start.ps1" "$bundle_root/release-scripts/windows/start.ps1"
    cp "$WINDOWS_RELEASE_SCRIPTS_DIR/stop.ps1" "$bundle_root/release-scripts/windows/stop.ps1"
    cp "$WINDOWS_RELEASE_SCRIPTS_DIR/start.cmd" "$bundle_root/release-scripts/windows/start.cmd"
    cp "$WINDOWS_RELEASE_SCRIPTS_DIR/stop.cmd" "$bundle_root/release-scripts/windows/stop.cmd"
  else
    cp "$PROGRAM_ASSETS_DIR/start.sh" "$bundle_root/start.sh"
    cp "$PROGRAM_ASSETS_DIR/stop.sh" "$bundle_root/stop.sh"
    chmod +x "$bundle_root/$binary_name" "$bundle_root/start.sh" "$bundle_root/stop.sh"
  fi

  mkdir -p "$RELEASE_DIR"
  tar -czf "$bundle_tar" -C "$tmp_dir" "$APP_NAME"

  echo "[release] done: $bundle_tar"
  rm -rf "$tmp_dir"
  trap - RETURN
}

while IFS= read -r target_spec; do
  local_target_os=""
  local_target_arch=""
  [[ -n "$target_spec" ]] || continue
  read -r local_target_os local_target_arch <<<"$target_spec"
  [[ -n "$local_target_os" && -n "$local_target_arch" ]] || die "invalid parsed program target: $target_spec"
  build_program_bundle "$local_target_os" "$local_target_arch"
done < <(parse_program_target_matrix)
