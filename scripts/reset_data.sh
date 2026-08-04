#!/usr/bin/env bash
# Wipes all transactional data (sprints, tasks, notes, KB articles, time logs,
# inbox items, attachments, activity log, recurring tasks) so you can start
# using the app for real. Keeps the seed tags and templates. Deletes uploaded
# attachment files too. Destructive — cannot be undone.
set -euo pipefail

cd "$(dirname "$0")/.."

DB_HOST="127.0.0.1"
DB_PORT="5432"
DB_NAME="planner_db"
DB_USER="planner"

read -r -p "This permanently deletes all sprints, tasks, notes, KB articles, time logs, inbox items, and attachments (keeping tags/templates). Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

echo "==> Truncating transactional tables..."
PGPASSWORD="${PGPASSWORD:-planner_local_dev}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
TRUNCATE TABLE
  activity_log,
  inbox_items,
  attachments,
  task_tags,
  note_tags,
  kb_tags,
  note_links,
  time_logs,
  notes,
  kb_articles,
  recurring_tasks,
  tasks,
  sprint_goals,
  sprint_retros,
  sprints
RESTART IDENTITY CASCADE;
SQL

echo "==> Clearing uploaded attachment files..."
find data/attachments -type f ! -name '.gitkeep' -delete 2>/dev/null || true

echo "==> Done. Tags and templates preserved; everything else is clean."
