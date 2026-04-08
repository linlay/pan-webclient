#!/usr/bin/env bash
set -euo pipefail

APP_NAME="pan-api"
PID_FILE=".runtime/$APP_NAME.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "[stop] pid file not found"
  exit 0
fi

pid="$(cat "$PID_FILE")"
if [[ -z "$pid" ]]; then
  rm -f "$PID_FILE"
  echo "[stop] pid file was empty; removed stale file"
  exit 0
fi

if ! kill -0 "$pid" >/dev/null 2>&1; then
  rm -f "$PID_FILE"
  echo "[stop] process $pid is not running; removed stale pid file"
  exit 0
fi

kill "$pid"

for _ in $(seq 1 30); do
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    rm -f "$PID_FILE"
    echo "[stop] stopped $APP_NAME (pid=$pid)"
    exit 0
  fi
  sleep 1
done

echo "[stop] process $pid did not stop within 30s" >&2
exit 1
