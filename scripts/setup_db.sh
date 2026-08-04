#!/usr/bin/env bash
# One-time (idempotent) local setup: starts Postgres, creates the app role/db,
# writes backend/.env if missing, runs migrations, seeds reference data.
set -euo pipefail

cd "$(dirname "$0")/.."

DB_ROLE="planner"
DB_PASSWORD="planner_local_dev"
DB_NAME="planner_db"
DB_HOST="127.0.0.1"
DB_PORT="5432"

echo "==> Ensuring Postgres is running (postgresql@14 via Homebrew)..."
if command -v brew >/dev/null 2>&1; then
  brew services start postgresql@14 >/dev/null 2>&1 || true
fi

echo "==> Waiting for Postgres to accept connections..."
for i in $(seq 1 20); do
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
  echo "Postgres did not become ready. Start it manually and re-run this script." >&2
  exit 1
fi

echo "==> Ensuring role '$DB_ROLE' exists..."
psql -h "$DB_HOST" -p "$DB_PORT" -d postgres -tAc \
  "SELECT 1 FROM pg_roles WHERE rolname='$DB_ROLE'" | grep -q 1 || \
  psql -h "$DB_HOST" -p "$DB_PORT" -d postgres -c \
  "CREATE ROLE $DB_ROLE LOGIN PASSWORD '$DB_PASSWORD';"

echo "==> Ensuring database '$DB_NAME' exists..."
psql -h "$DB_HOST" -p "$DB_PORT" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  psql -h "$DB_HOST" -p "$DB_PORT" -d postgres -c \
  "CREATE DATABASE $DB_NAME OWNER $DB_ROLE;"

if [ ! -f backend/.env ]; then
  echo "==> Writing backend/.env from template..."
  cp backend/.env.example backend/.env
fi

echo "==> Running Alembic migrations..."
(cd backend && venv/bin/alembic upgrade head)

echo "==> Seeding reference data (tags, templates)..."
(cd backend && venv/bin/python seed.py)

echo "==> Done. DB '$DB_NAME' ready for role '$DB_ROLE' at $DB_HOST:$DB_PORT."
