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

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64) echo "amd64" ;;
    arm64|aarch64) echo "arm64" ;;
    *) die "cannot detect ARCH from $(uname -m); pass ARCH=amd64|arm64" ;;
  esac
}

require_image_release_tools() {
  command -v docker >/dev/null 2>&1 || die "docker is required"
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

require_program_release_tools() {
  command -v go >/dev/null 2>&1 || die "go is required"
  command -v npm >/dev/null 2>&1 || die "npm is required"
  command -v tar >/dev/null 2>&1 || die "tar is required"
}

validate_target_os() {
  case "$1" in
    darwin|windows|linux) ;;
    *) die "target OS must be darwin, windows, or linux (got: $1)" ;;
  esac
}

validate_target_arch() {
  case "$1" in
    amd64|arm64) ;;
    *) die "ARCH must be amd64 or arm64 (got: $1)" ;;
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
