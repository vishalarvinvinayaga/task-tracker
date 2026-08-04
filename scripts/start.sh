#!/usr/bin/env bash
# Starts the backend (FastAPI) and frontend (Vite) dev servers in the background.
# Postgres is left alone — it's expected to run as its own background service
# (start it once with: brew services start postgresql@14).
set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"
RUN_DIR="$PROJECT_ROOT/.run"
mkdir -p "$RUN_DIR"

BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"
BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"

is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null
}

if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  echo "Warning: Postgres doesn't look reachable at 127.0.0.1:5432."
  echo "Start it with: brew services start postgresql@14"
fi

if is_running "$BACKEND_PID_FILE"; then
  echo "Backend already running (pid $(cat "$BACKEND_PID_FILE"))."
else
  echo "==> Starting backend (FastAPI) on http://127.0.0.1:8000 ..."
  (
    cd "$PROJECT_ROOT/backend"
    nohup venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 > "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
  )
fi

if is_running "$FRONTEND_PID_FILE"; then
  echo "Frontend already running (pid $(cat "$FRONTEND_PID_FILE"))."
else
  echo "==> Starting frontend (Vite) on http://localhost:5173 ..."
  (
    cd "$PROJECT_ROOT/frontend"
    nohup node_modules/.bin/vite > "$FRONTEND_LOG" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
  )
fi

sleep 2
echo ""
echo "Backend:  http://127.0.0.1:8000  (logs: $BACKEND_LOG)"
echo "Frontend: http://localhost:5173  (logs: $FRONTEND_LOG)"
echo ""
echo "Stop with: ./scripts/stop.sh"
