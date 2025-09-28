#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export GOCACHE="${GOCACHE:-$ROOT_DIR/.gocache}"
GO_BIN="$(go env GOPATH)/bin"
DEFAULT_TEMPL_BIN="$GO_BIN/templ"
DEFAULT_AIR_BIN="$GO_BIN/air"
STOPPING=0

TEMPL_BIN="${TEMPL_BIN:-}"
AIR_BIN="${AIR_BIN:-}"

if [[ -z "$TEMPL_BIN" ]]; then
  if command -v templ >/dev/null 2>&1; then
    TEMPL_BIN="$(command -v templ)"
  elif [[ -x "$DEFAULT_TEMPL_BIN" ]]; then
    TEMPL_BIN="$DEFAULT_TEMPL_BIN"
  fi
fi

if [[ -z "$AIR_BIN" ]]; then
  if command -v air >/dev/null 2>&1; then
    AIR_BIN="$(command -v air)"
  elif [[ -x "$DEFAULT_AIR_BIN" ]]; then
    AIR_BIN="$DEFAULT_AIR_BIN"
  fi
fi

log() {
  printf '[dev] %s\n' "$*"
}

if [[ -f "$ROOT_DIR/.env" ]]; then
  log "Loading environment from .env"
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

if [[ -z "$TEMPL_BIN" || ! -x "$TEMPL_BIN" ]]; then
  log "templ binary not found. Install it with 'go install github.com/a-h/templ/cmd/templ@v0.3.943'"
  exit 1
fi

if [[ -z "$AIR_BIN" || ! -x "$AIR_BIN" ]]; then
  log "air binary not found. Install it with 'go install github.com/air-verse/air@v1.63.0'"
  exit 1
fi

run_air() {
  while [[ $STOPPING -eq 0 ]]; do
    set +e
    "$AIR_BIN" -c "$ROOT_DIR/air.toml"
    local code=$?
    set -e
    if [[ $STOPPING -eq 1 ]]; then
      return 0
    fi
    if [[ $code -eq 0 ]]; then
      log "Air exited cleanly"
      return 0
    fi
    log "Air exited with status $code; restarting in 2s"
    sleep 2
  done
  return 0
}

cleanup() {
  local exit_code=${1:-0}
  STOPPING=1
  trap - INT TERM
  if [[ ${#pids[@]} -gt 0 ]]; then
    log "Stopping background processes"
    for pid in "${pids[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
      fi
    done
    wait "${pids[@]}" 2>/dev/null || true
  fi
  exit "$exit_code"
}

trap 'cleanup 0' INT TERM

log "Running initial templ generate"
"$TEMPL_BIN" generate

pids=()

log "Watching templ components"
"$TEMPL_BIN" generate --watch &
pids+=($!)

log "Watching Tailwind CSS"
npm run dev:css &
pids+=($!)

log "Starting Go API with Air"
run_air &
pids+=($!)

set +e
exit_code=0
for pid in "${pids[@]}"; do
  if ! wait "$pid"; then
    code=$?
    log "Process $pid exited with status $code"
    if [[ $exit_code -eq 0 ]]; then
      exit_code=$code
    fi
  fi
done
set -e

cleanup "$exit_code"
