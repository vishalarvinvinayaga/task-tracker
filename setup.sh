#!/usr/bin/env bash
# One-time onboarding for a fresh clone of this repo (macOS only).
#
# Installs/checks Homebrew, Python 3.12, Node 18+, and Postgres 14, then sets
# up the backend venv, the database (via scripts/setup_db.sh), the frontend
# deps, the MCP server venv, and rewrites .mcp.json to this machine's actual
# clone path. Safe to re-run — every step skips if already satisfied.
#
# Usage:
#   ./setup.sh
# Then:
#   ./scripts/start.sh
set -euo pipefail

cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

step()  { echo -e "\n${BOLD}==> $1${RESET}"; }
ok()    { echo -e "${GREEN}✓${RESET} $1"; }
warn()  { echo -e "${YELLOW}!${RESET} $1"; }
fail()  { echo -e "${RED}✗ $1${RESET}"; exit 1; }

if [[ "$(uname -s)" != "Darwin" ]]; then
  fail "This setup script targets macOS (uses Homebrew). On another OS, follow README.md manually."
fi

echo -e "${BOLD}Personal Command Center — first-time setup${RESET}"
echo -e "${DIM}Project root: $PROJECT_ROOT${RESET}"

# ------------------------------------------------------------------
# 1. Homebrew — guarded, not auto-installed (needs sudo/interactive)
# ------------------------------------------------------------------
step "Checking Homebrew"
if command -v brew >/dev/null 2>&1; then
  ok "Homebrew found ($(brew --version | head -1))"
else
  warn "Homebrew is not installed."
  echo "Install it yourself first (it needs your password), then re-run this script:"
  echo ""
  echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  echo ""
  fail "Homebrew required."
fi

# ------------------------------------------------------------------
# 2. Python 3.12
# ------------------------------------------------------------------
step "Checking Python 3.12"
PYTHON_BIN=""
if command -v python3.12 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3.12)"
elif brew --prefix python@3.12 >/dev/null 2>&1; then
  candidate="$(brew --prefix python@3.12)/bin/python3.12"
  [[ -x "$candidate" ]] && PYTHON_BIN="$candidate"
fi

if [[ -z "$PYTHON_BIN" ]]; then
  warn "Python 3.12 not found — installing via Homebrew..."
  brew install python@3.12
  PYTHON_BIN="$(brew --prefix python@3.12)/bin/python3.12"
fi
[[ -x "$PYTHON_BIN" ]] || fail "Could not locate a working python3.12 after install."
ok "Python 3.12 at $PYTHON_BIN"

# ------------------------------------------------------------------
# 3. Node.js 18+
# ------------------------------------------------------------------
step "Checking Node.js"
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
  if [[ "$NODE_MAJOR" -lt 18 ]]; then
    warn "Node $(node -v) found but 18+ is required — installing latest via Homebrew..."
    brew install node
  else
    ok "Node $(node -v) found"
  fi
else
  warn "Node not found — installing via Homebrew..."
  brew install node
  ok "Node $(node -v) installed"
fi

# ------------------------------------------------------------------
# 4. PostgreSQL 14
# ------------------------------------------------------------------
step "Checking PostgreSQL 14"
if brew list postgresql@14 >/dev/null 2>&1; then
  ok "postgresql@14 already installed"
else
  warn "postgresql@14 not found — installing via Homebrew..."
  brew install postgresql@14
fi
brew services start postgresql@14 >/dev/null 2>&1 || true
ok "postgresql@14 running as a background service"

# ------------------------------------------------------------------
# 5. Backend venv + dependencies
# ------------------------------------------------------------------
step "Setting up backend virtual environment"
if [[ ! -d backend/venv ]]; then
  "$PYTHON_BIN" -m venv backend/venv
  ok "Created backend/venv"
else
  ok "backend/venv already exists"
fi
backend/venv/bin/pip install -q --upgrade pip
backend/venv/bin/pip install -q -r backend/requirements.txt
ok "Backend dependencies installed"

# ------------------------------------------------------------------
# 6. Database: role, db, migrations, seed data
# ------------------------------------------------------------------
step "Setting up the database"
./scripts/setup_db.sh

# ------------------------------------------------------------------
# 7. Frontend dependencies
# ------------------------------------------------------------------
step "Installing frontend dependencies"
(cd frontend && npm install)
ok "Frontend dependencies installed"

# ------------------------------------------------------------------
# 8. MCP server venv + dependencies
# ------------------------------------------------------------------
step "Setting up the MCP server virtual environment"
if [[ ! -d mcp-server/venv ]]; then
  "$PYTHON_BIN" -m venv mcp-server/venv
  ok "Created mcp-server/venv"
else
  ok "mcp-server/venv already exists"
fi
mcp-server/venv/bin/pip install -q --upgrade pip
mcp-server/venv/bin/pip install -q -r mcp-server/requirements.txt
ok "MCP server dependencies installed"

# ------------------------------------------------------------------
# 9. Point .mcp.json at this machine's actual clone path
# ------------------------------------------------------------------
step "Configuring .mcp.json for this machine"
python3 - "$PROJECT_ROOT" <<'PYEOF'
import json
import sys

root = sys.argv[1]
path = f"{root}/.mcp.json"

with open(path) as f:
    config = json.load(f)

server = config.setdefault("mcpServers", {}).setdefault("personal-planner", {})
server["type"] = "stdio"
server["command"] = f"{root}/mcp-server/venv/bin/python"
server["args"] = [f"{root}/mcp-server/server.py"]

with open(path, "w") as f:
    json.dump(config, f, indent=2)
    f.write("\n")
PYEOF
ok ".mcp.json now points at $PROJECT_ROOT"

# ------------------------------------------------------------------
echo -e "\n${GREEN}${BOLD}Setup complete.${RESET}"
echo -e "Start the app with:\n"
echo -e "  ${BOLD}./scripts/start.sh${RESET}\n"
echo -e "Then open ${BOLD}http://localhost:5173${RESET}"
echo -e "${DIM}(If using Claude Code in this project, accept the .mcp.json trust prompt to enable conversational planning.)${RESET}"
