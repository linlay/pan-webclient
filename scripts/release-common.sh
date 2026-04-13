#!/usr/bin/env bash
set -euo pipefail

APP_NAME="pan-webclient"
PROGRAM_NAME="pan-api"
API_IMAGE_REPOSITORY="${APP_NAME}-backend"
FRONTEND_IMAGE_REPOSITORY="${APP_NAME}-frontend"

die() {
  echo "[release] $*" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || die "required file not found: $path"
}

require_dir() {
  local path="$1"
  [[ -d "$path" ]] || die "required directory not found: $path"
}

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64) echo "amd64" ;;
    arm64|aarch64) echo "arm64" ;;
    *) die "cannot detect ARCH from $(uname -m); pass ARCH=amd64|arm64" ;;
  esac
}

validate_target_arch() {
  case "$1" in
    amd64|arm64) ;;
    *) die "ARCH must be amd64 or arm64 (got: $1)" ;;
  esac
}

validate_target_os() {
  case "$1" in
    darwin|windows|linux) ;;
    *) die "target OS must be darwin, windows, or linux (got: $1)" ;;
  esac
}

require_image_release_tools() {
  command -v docker >/dev/null 2>&1 || die "docker is required"
}

require_program_release_tools() {
  command -v go >/dev/null 2>&1 || die "go is required"
  command -v npm >/dev/null 2>&1 || die "npm is required"
}

resolve_release_context() {
  VERSION="${VERSION:-$(cat "$REPO_ROOT/VERSION" 2>/dev/null || echo "dev")}"
  [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "VERSION must match vX.Y.Z (got: $VERSION)"

  ARCH="${ARCH:-$(detect_arch)}"
  validate_target_arch "$ARCH"

  PLATFORM="linux/$ARCH"
  RELEASE_DIR="$REPO_ROOT/dist/release"
  API_IMAGE="${API_IMAGE_REPOSITORY}:${VERSION}"
  FRONTEND_IMAGE="${FRONTEND_IMAGE_REPOSITORY}:${VERSION}"
}

archive_format_for_os() {
  local target_os="$1"
  validate_target_os "$target_os"
  case "$target_os" in
    windows) printf 'zip\n' ;;
    *) printf 'tar.gz\n' ;;
  esac
}

require_archive_tool_for_os() {
  local target_os="$1"
  local archive_format
  archive_format="$(archive_format_for_os "$target_os")"
  case "$archive_format" in
    tar.gz) command -v tar >/dev/null 2>&1 || die "tar is required for $target_os bundles" ;;
    zip) command -v zip >/dev/null 2>&1 || die "zip is required for $target_os bundles" ;;
    *) die "unsupported archive format: $archive_format" ;;
  esac
}

archive_bundle_dir() {
  local stage_root="$1"
  local bundle_dir_name="$2"
  local output_path="$3"
  local format="$4"

  mkdir -p "$(dirname "$output_path")"

  case "$format" in
    tar.gz)
      tar -czf "$output_path" -C "$stage_root" "$bundle_dir_name"
      ;;
    zip)
      (
        cd "$stage_root"
        zip -qr "$output_path" "$bundle_dir_name"
      )
      ;;
    *)
      die "unsupported archive format: $format"
      ;;
  esac
}

binary_name_for_os() {
  local target_os="$1"
  validate_target_os "$target_os"
  if [[ "$target_os" == "windows" ]]; then
    printf '%s.exe\n' "$PROGRAM_NAME"
    return
  fi
  printf '%s\n' "$PROGRAM_NAME"
}

program_bundle_filename() {
  local version="$1"
  local target_os="$2"
  local target_arch="$3"
  local archive_format="$4"
  printf '%s-%s-%s-%s.%s\n' "$APP_NAME" "$version" "$target_os" "$target_arch" "$archive_format"
}

parse_program_target_matrix_entries() {
  local raw="${PROGRAM_TARGET_MATRIX//[[:space:]]/}"
  local entry
  local target_os
  local target_arch

  [[ -n "$raw" ]] || die "PROGRAM_TARGET_MATRIX is set but empty"

  for entry in ${raw//,/ }; do
    [[ -n "$entry" ]] || continue
    if [[ ! "$entry" =~ ^([^/]+)/([^/]+)$ ]]; then
      die "PROGRAM_TARGET_MATRIX entries must be os/arch (got: $entry)"
    fi
    target_os="${BASH_REMATCH[1]}"
    target_arch="${BASH_REMATCH[2]}"
    validate_target_os "$target_os"
    validate_target_arch "$target_arch"
    printf '%s %s\n' "$target_os" "$target_arch"
  done
}

parse_program_targets_with_arch() {
  local raw="${PROGRAM_TARGETS//[[:space:]]/}"
  raw="${raw//,/ }"
  [[ -n "$raw" ]] || die "PROGRAM_TARGETS is set but empty"
  for target in $raw; do
    validate_target_os "$target"
    printf '%s %s\n' "$target" "$ARCH"
  done
}

parse_program_target_matrix() {
  if [[ "${PROGRAM_TARGET_MATRIX+x}" == "x" ]]; then
    parse_program_target_matrix_entries
    return
  fi
  if [[ "${PROGRAM_TARGETS+x}" == "x" ]]; then
    parse_program_targets_with_arch
    return
  fi
  PROGRAM_TARGET_MATRIX="darwin/arm64,windows/amd64" parse_program_target_matrix_entries
}

build_frontend_dist() {
  echo "[release] building frontend dist..."
  (
    cd "$REPO_ROOT/frontend"
    npm ci
    npm run build
  )
}

build_backend_image_to_tar() {
  local output_tar="$1"

  echo "[release] building backend image..."
  docker buildx build \
    --platform "$PLATFORM" \
    --file "$REPO_ROOT/backend/Dockerfile" \
    --tag "$API_IMAGE" \
    --output "type=docker,dest=$output_tar" \
    "$REPO_ROOT"
}

build_frontend_image_to_tar() {
  local output_tar="$1"

  echo "[release] building frontend image..."
  docker buildx build \
    --platform "$PLATFORM" \
    --file "$REPO_ROOT/frontend/Dockerfile" \
    --tag "$FRONTEND_IMAGE" \
    --output "type=docker,dest=$output_tar" \
    "$REPO_ROOT"
}

write_program_manifest() {
  local dest="$1"
  local target_os="$2"
  local target_arch="$3"
  local backend_entry="$4"
  local asset_file_name="$5"
  local start_script="start.sh"
  local stop_script="stop.sh"
  local deploy_script="deploy.sh"
  local program_common="scripts/program-common.sh"
  local error_log_json=""

  if [[ "$target_os" == "windows" ]]; then
    start_script="start.ps1"
    stop_script="stop.ps1"
    deploy_script="deploy.ps1"
    program_common="scripts/program-common.ps1"
    error_log_json='    "errorLogRelativePath": "run/pan-api.stderr.log",'
  fi

  cat >"$dest" <<EOF
{
  "id": "$APP_NAME",
  "name": "网盘",
  "kind": "plugin",
  "version": "$VERSION",
  "description": "内置网盘服务，包含 Go 后端和已构建 React 前端。",
  "platform": {
    "os": "$target_os",
    "arch": "$target_arch"
  },
  "frontend": {
    "mode": "standalone",
    "entry": "/pan/",
    "directAccess": true,
    "hostManaged": false
  },
  "backend": {
    "entry": "$backend_entry"
  },
  "scripts": {
    "start": ["$start_script", "--daemon"],
    "stop": "$stop_script",
    "deploy": "$deploy_script"
  },
  "configFiles": [
    {
      "key": "env",
      "label": ".env",
      "relativePath": ".env",
      "templateRelativePath": ".env.example",
      "required": true
    }
  ],
  "runtime": {
    "pidRelativePath": "run/pan-api.pid",
    "logRelativePath": "run/pan-api.log",
${error_log_json}
    "requiredPaths": [
      "$backend_entry",
      "$start_script",
      "$stop_script",
      "$deploy_script",
      "$program_common",
      ".env.example",
      "manifest.json",
      "configs/local-public-key.example.pem",
      "configs/mounts",
      "frontend/dist/index.html"
    ]
  },
  "web": {
    "routePath": "/pan/",
    "portEnvKey": "API_PORT",
    "defaultPort": 8080
  },
  "desktop": {
    "assetFileName": "$asset_file_name",
    "bundleTopLevelDir": "$APP_NAME"
  }
}
EOF
}
