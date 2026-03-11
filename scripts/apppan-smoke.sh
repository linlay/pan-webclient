#!/usr/bin/env bash

set -euo pipefail

DEFAULT_APP_PORT="$(sed -n 's/^APP_PORT=//p' .env 2>/dev/null | tail -n 1)"
if [[ -z "${DEFAULT_APP_PORT}" ]]; then
  DEFAULT_APP_PORT="11936"
fi

BASE_URL="${APPPAN_BASE_URL:-http://127.0.0.1:${DEFAULT_APP_PORT}/apppan/api}"
TOKEN="${APPPAN_BEARER_TOKEN:-${PAN_APP_BEARER_TOKEN:-}}"
SHOW_HIDDEN="${APPPAN_SHOW_HIDDEN:-0}"
JQ_BIN="${JQ_BIN:-jq}"

if [[ -z "${TOKEN}" ]]; then
  echo "missing APPPAN_BEARER_TOKEN (or PAN_APP_BEARER_TOKEN)" >&2
  exit 1
fi

has_jq() {
  command -v "${JQ_BIN}" >/dev/null 2>&1
}

pretty_print() {
  local payload="$1"
  if has_jq; then
    printf '%s' "${payload}" | "${JQ_BIN}"
    return
  fi
  printf '%s\n' "${payload}"
}

urlencode() {
  local raw="$1"
  if has_jq; then
    printf '%s' "${raw}" | "${JQ_BIN}" -sRr @uri
    return
  fi
  local encoded="${raw// /%20}"
  encoded="${encoded//\//%2F}"
  printf '%s' "${encoded}"
}

request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local response status payload

  if [[ -n "${body}" ]]; then
    response="$(
      curl -sS \
        -X "${method}" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        --data "${body}" \
        -w $'\n%{http_code}' \
        "${BASE_URL}${path}"
    )"
  else
    response="$(
      curl -sS \
        -X "${method}" \
        -H "Authorization: Bearer ${TOKEN}" \
        -w $'\n%{http_code}' \
        "${BASE_URL}${path}"
    )"
  fi

  status="$(printf '%s' "${response}" | tail -n 1)"
  payload="$(printf '%s' "${response}" | sed '$d')"

  echo
  echo ">>> ${method} ${BASE_URL}${path}"
  echo "HTTP ${status}"
  pretty_print "${payload}"

  if [[ "${status}" -ge 400 ]]; then
    echo "request failed: ${method} ${path}" >&2
    exit 1
  fi

  REPLY="${payload}"
}

extract_with_jq() {
  local payload="$1"
  local expr="$2"
  if ! has_jq; then
    return 1
  fi
  printf '%s' "${payload}" | "${JQ_BIN}" -r "${expr}"
}

request GET "/web/session/me"
session_payload="${REPLY}"

if has_jq; then
  auth_method="$(extract_with_jq "${session_payload}" '.authMethod // empty')"
  if [[ "${auth_method}" != "token" ]]; then
    echo "unexpected authMethod: ${auth_method}" >&2
    exit 1
  fi
fi

request GET "/mounts"
mounts_payload="${REPLY}"

mount_id="${APPPAN_MOUNT_ID:-}"
if [[ -z "${mount_id}" ]] && has_jq; then
  mount_id="$(extract_with_jq "${mounts_payload}" '.[0].id // empty')"
fi

if [[ -z "${mount_id}" ]]; then
  echo
  echo "mount id not resolved automatically; export APPPAN_MOUNT_ID and rerun for files/tree/preview checks" >&2
  request GET "/tasks"
  exit 0
fi

encoded_mount_id="$(urlencode "${mount_id}")"
encoded_root_path="$(urlencode "/")"

request GET "/tree?mountId=${encoded_mount_id}&path=${encoded_root_path}&showHidden=${SHOW_HIDDEN}"
request GET "/files?mountId=${encoded_mount_id}&path=${encoded_root_path}&showHidden=${SHOW_HIDDEN}"
files_payload="${REPLY}"

if has_jq; then
  preview_path="$(extract_with_jq "${files_payload}" 'if length > 0 then .[0].path else empty end')"
  if [[ -n "${preview_path}" ]]; then
    encoded_preview_path="$(urlencode "${preview_path}")"
    request GET "/preview?mountId=${encoded_mount_id}&path=${encoded_preview_path}"
  fi
fi

request GET "/tasks"
tasks_payload="${REPLY}"

if has_jq; then
  bad_download_url_count="$(
    printf '%s' "${tasks_payload}" | "${JQ_BIN}" '[.[] | select(.downloadUrl? != null and (.downloadUrl | startswith("/apppan/api/") | not))] | length'
  )"
  if [[ "${bad_download_url_count}" != "0" ]]; then
    echo "detected task downloadUrl without /apppan/api prefix" >&2
    exit 1
  fi
fi

echo
echo "apppan smoke test passed"
