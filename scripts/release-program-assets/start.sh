#!/usr/bin/env bash
set -euo pipefail

APP_NAME="pan-api"
RUNTIME_DIR=".runtime"
PID_FILE="$RUNTIME_DIR/$APP_NAME.pid"
LOG_FILE="$RUNTIME_DIR/$APP_NAME.log"

die() {
  echo "[start] $*" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -e "$path" ]] || die "required file not found: $path"
}

load_env() {
  [[ -f ./.env ]] || die ".env not found; run: cp .env.example .env"
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
}

ensure_bundle_root() {
  require_file "./$APP_NAME"
  require_file "./.env.example"
  require_file "./configs/local-public-key.example.pem"
}

ensure_runtime_inputs() {
  require_file "./configs/local-public-key.pem"
  local frontend_dist="${FRONTEND_DIST_DIR:-./frontend/dist}"
  require_file "$frontend_dist/index.html"
}

ensure_runtime_dirs() {
  mkdir -p "$RUNTIME_DIR" ./data ./configs/mounts
}

check_stale_pid() {
  if [[ ! -f "$PID_FILE" ]]; then
    return
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
    die "$APP_NAME is already running with pid $pid"
  fi
  rm -f "$PID_FILE"
}

start_daemon() {
  check_stale_pid
  : >"$LOG_FILE"
  nohup "./$APP_NAME" >>"$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" >"$PID_FILE"
  sleep 1
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    rm -f "$PID_FILE"
    die "daemon failed to start; check $LOG_FILE"
  fi
  echo "[start] started $APP_NAME (pid=$pid)"
  echo "[start] log file: $LOG_FILE"
  echo "[start] browser: http://127.0.0.1:${API_PORT:-8080}/pan/"
}

main() {
  ensure_bundle_root
  load_env
  ensure_runtime_inputs
  ensure_runtime_dirs
  start_daemon
}

main "$@"
