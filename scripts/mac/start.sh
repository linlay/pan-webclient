#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

resolve_base_dir() {
  if [[ -x "$SCRIPT_DIR/backend/pan-api" && -d "$SCRIPT_DIR/web" ]]; then
    printf '%s\n' "$SCRIPT_DIR"
    return 0
  fi

  if [[ -f "$SCRIPT_DIR/../../Makefile" && -d "$SCRIPT_DIR/../../backend" ]]; then
    cd "$SCRIPT_DIR/../.." && pwd
    return 0
  fi

  echo "[start] unable to resolve base dir from script dir: $SCRIPT_DIR" >&2
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

die() {
  echo "[start] $*" >&2
  exit 1
}

require_port() {
  local value="$1"
  local name="$2"
  if [[ -z "$value" ]]; then
    die "missing required $name in .env"
  fi
  if [[ ! "$value" =~ ^[0-9]+$ ]] || (( value < 1 || value > 65535 )); then
    die "invalid $name=$value"
  fi
}

is_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

BASE_DIR="$(resolve_base_dir)"
DEFAULT_RELEASE_DIR="$(resolve_default_release_dir "$BASE_DIR")"
RELEASE_DIR="${1:-$DEFAULT_RELEASE_DIR}"
[[ "$RELEASE_DIR" = /* ]] || RELEASE_DIR="$BASE_DIR/$RELEASE_DIR"
RUN_DIR="$RELEASE_DIR/run"
LOG_DIR="$RELEASE_DIR/logs"
ENV_FILE="$RELEASE_DIR/.env"
BACKEND_BINARY="$RELEASE_DIR/backend/pan-api"
PID_FILE="$RUN_DIR/pan-api.pid"
LOG_FILE="$LOG_DIR/pan-api.out"

[[ -f "$ENV_FILE" ]] || die "missing required config: $ENV_FILE (copy from .env.example)"
[[ -x "$BACKEND_BINARY" ]] || die "missing required release artifact: $BACKEND_BINARY"

mkdir -p "$RUN_DIR" "$LOG_DIR" "$RELEASE_DIR/data"

set -a
. "$ENV_FILE"
set +a

APP_PORT="${APP_PORT:-8080}"
WEB_PORT="${WEB_PORT:-$APP_PORT}"
PAN_STATIC_DIR="${PAN_STATIC_DIR:-./web}"
PAN_DATA_DIR="${PAN_DATA_DIR:-./data}"
export APP_PORT WEB_PORT PAN_STATIC_DIR PAN_DATA_DIR

require_port "$APP_PORT" "APP_PORT"
require_port "$WEB_PORT" "WEB_PORT"

if [[ "$PAN_STATIC_DIR" = /* ]]; then
  RESOLVED_STATIC_DIR="$PAN_STATIC_DIR"
else
  RESOLVED_STATIC_DIR="$RELEASE_DIR/${PAN_STATIC_DIR#./}"
fi
[[ -f "$RESOLVED_STATIC_DIR/index.html" ]] || die "missing required static assets: $RESOLVED_STATIC_DIR/index.html"

if [[ -f "$PID_FILE" ]]; then
  existing_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$existing_pid" ]] && is_running "$existing_pid"; then
    die "pan-api is already running (pid=$existing_pid)"
  fi
  rm -f "$PID_FILE"
fi

(
  cd "$RELEASE_DIR"
  nohup "$BACKEND_BINARY" >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
)

sleep 1
backend_pid="$(cat "$PID_FILE")"
if ! is_running "$backend_pid"; then
  die "pan-api failed to start, see $LOG_FILE"
fi

echo "[start] pan-api pid=$backend_pid http://127.0.0.1:$APP_PORT"
echo "[start] release dir: $RELEASE_DIR"
echo "[start] logs: $LOG_FILE"
