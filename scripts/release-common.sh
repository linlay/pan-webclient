#!/usr/bin/env bash

REPO_NAME="${REPO_NAME:-pan-webclient}"
API_IMAGE_NAME="${API_IMAGE_NAME:-pan-webclient-api}"
FRONTEND_IMAGE_NAME="${FRONTEND_IMAGE_NAME:-pan-webclient-frontend}"
RELEASE_ROOT_REL="${RELEASE_ROOT_REL:-dist/release}"

die() {
  echo "[release] $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

require_version() {
  [[ -n "${VERSION:-}" ]] || die "VERSION is required"
  [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "VERSION must match vX.Y.Z"
}

require_arch() {
  [[ -n "${ARCH:-}" ]] || die "ARCH is required"
  case "$ARCH" in
    amd64|arm64) ;;
    *)
      die "ARCH must be amd64 or arm64"
      ;;
  esac
}

platform_for_arch() {
  echo "linux/$1"
}

platform_slug() {
  echo "linux-$1"
}

goarch_for_arch() {
  echo "$1"
}

host_arch() {
  case "$(uname -m)" in
    x86_64|amd64) echo "amd64" ;;
    arm64|aarch64) echo "arm64" ;;
    *) echo "unknown" ;;
  esac
}

warn_if_cross_build() {
  local target_arch="$1"
  local current_arch
  current_arch="$(host_arch)"
  if [[ "$current_arch" != "unknown" && "$current_arch" != "$target_arch" ]]; then
    echo "[release] warning: host arch is $current_arch, target arch is $target_arch; cross-arch Docker build may be slow or fail" >&2
  fi
}

release_root_dir() {
  echo "$REPO_ROOT/$RELEASE_ROOT_REL"
}

build_dir_for() {
  echo "$(release_root_dir)/build/$1/$(platform_slug "$2")"
}

bundle_path_for() {
  echo "$(release_root_dir)/bundles/${REPO_NAME}-$1-$(platform_slug "$2").tar.gz"
}

api_image_ref_for() {
  echo "${API_IMAGE_NAME}:$1-$(platform_slug "$2")"
}

frontend_image_ref_for() {
  echo "${FRONTEND_IMAGE_NAME}:$1-$(platform_slug "$2")"
}

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}
