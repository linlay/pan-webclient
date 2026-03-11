#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

resolve_base_dir() {
  if [[ -f "$SCRIPT_DIR/backend/pan-api" && -d "$SCRIPT_DIR/web" ]]; then
    printf '%s\n' "$SCRIPT_DIR"
    return 0
  fi

  if [[ -f "$SCRIPT_DIR/../../Makefile" && -d "$SCRIPT_DIR/../../backend" ]]; then
    cd "$SCRIPT_DIR/../.." && pwd
    return 0
  fi

  echo "[stop] unable to resolve base dir from script dir: $SCRIPT_DIR" >&2
  exit 1
}

resolve_default_release_dir() {
  local base_dir="$1"

  if [[ "$SCRIPT_DIR" == "$base_dir" ]]; then
    printf '%s\n' "$base_dir"
    return 0
  fi

  printf '%s/release\n' "$base_dir"
}

is_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

BASE_DIR="$(resolve_base_dir)"
DEFAULT_RELEASE_DIR="$(resolve_default_release_dir "$BASE_DIR")"
RELEASE_DIR="${1:-$DEFAULT_RELEASE_DIR}"
[[ "$RELEASE_DIR" = /* ]] || RELEASE_DIR="$BASE_DIR/$RELEASE_DIR"
PID_FILE="$RELEASE_DIR/run/pan-api.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "[stop] pan-api not running (pid file missing)"
  exit 0
fi

pid="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -z "$pid" ]]; then
  rm -f "$PID_FILE"
  echo "[stop] cleaned empty pid file"
  exit 0
fi

if ! is_running "$pid"; then
  rm -f "$PID_FILE"
  echo "[stop] pan-api already stopped (stale pid=$pid)"
  exit 0
fi

kill "$pid" >/dev/null 2>&1 || true
for _ in $(seq 1 15); do
  if ! is_running "$pid"; then
    rm -f "$PID_FILE"
    echo "[stop] pan-api stopped (pid=$pid)"
    exit 0
  fi
  sleep 1
done

kill -9 "$pid" >/dev/null 2>&1 || true
rm -f "$PID_FILE"
echo "[stop] pan-api forced to stop (pid=$pid)"
