#!/bin/bash
# One-shot setup for apiforge: installs deps and creates .env files for the
# Node.js server, the Python server, and the Node.js sidecar. Safe to re-run
# (skips steps that are already done, never overwrites an existing .env).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

ensure_env_file() {
    local dir=$1
    if [ -f "$dir/.env" ]; then
        ok ".env already exists in ${dir#$ROOT_DIR/}"
    elif [ -f "$dir/.env.example" ]; then
        cp "$dir/.env.example" "$dir/.env"
        ok "Created ${dir#$ROOT_DIR/}/.env from .env.example"
    fi
}

missing_tool=0

if ! command_exists node; then
    fail "node not found — install Node.js (https://nodejs.org) before continuing"
    missing_tool=1
fi

if ! command_exists pnpm; then
    fail "pnpm not found — install it (https://pnpm.io/installation) before continuing"
    missing_tool=1
fi

if ! command_exists python3; then
    fail "python3 not found — install Python 3 before continuing"
    missing_tool=1
fi

if [ "$missing_tool" -eq 1 ]; then
    exit 1
fi

echo ""
echo "== Node.js server (entry/nodejs) =="
nodejs_dir="$ROOT_DIR/entry/nodejs"
(cd "$nodejs_dir" && pnpm install && pnpm approve-builds --all)
ensure_env_file "$nodejs_dir"

echo ""
echo "== Node.js sidecar (entry/sidecar) =="
sidecar_dir="$ROOT_DIR/entry/sidecar"
(cd "$sidecar_dir" && pnpm install && pnpm approve-builds --all)
ensure_env_file "$sidecar_dir"

echo ""
echo "== Python server (entry/python) =="
python_dir="$ROOT_DIR/entry/python"
if [ -d "$python_dir/.venv" ]; then
    ok "Virtualenv already exists at entry/python/.venv"
else
    python3 -m venv "$python_dir/.venv"
    ok "Created virtualenv at entry/python/.venv"
fi
(cd "$python_dir" && "./.venv/bin/pip" install -q -r requirements.txt)
ok "Installed Python dependencies"
ensure_env_file "$python_dir"

echo ""
ok "apiforge is set up."
echo ""
echo "Next steps:"
echo "  Node.js server:  cd entry/nodejs  && pnpm run dev"
echo "  Python server:   cd entry/python  && source .venv/bin/activate && uvicorn common.server:app --reload --port 8000"
echo "  Sidecar:         cd entry/sidecar && pnpm run dev"
echo ""
echo "Create a new app:"
echo "  ./scripts/bash/create-node-app.sh <app_name>"
echo "  ./scripts/bash/create-python-app.sh <app_name>"
