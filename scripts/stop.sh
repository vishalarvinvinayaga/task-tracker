#!/usr/bin/env bash
# Stops the backend and frontend dev servers started by start.sh.
# Postgres is left running (it's a normal background service).
set -euo pipefail

cd "$(dirname "$0")/.."
RUN_DIR=".run"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

stop_pid_file() {
  local name="$1"
  local pid_file="$2"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "==> Stopping $name (pid $pid) ..."
      kill "$pid" 2>/dev/null || true
      for _ in $(seq 1 10); do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.5
      done
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
    else
      echo "$name not running (stale pid file)."
    fi
    rm -f "$pid_file"
  else
    echo "$name not running."
  fi
}

stop_pid_file "backend" "$BACKEND_PID_FILE"
stop_pid_file "frontend" "$FRONTEND_PID_FILE"

echo "Done. (Postgres left running — stop it separately with: brew services stop postgresql@14)"
