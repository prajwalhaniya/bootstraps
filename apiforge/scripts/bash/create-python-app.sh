#!/bin/bash
# Scaffold a new app under entry/python/apps and wire its router into the
# single shared Python server (entry/python/common/server.py). There is only
# one Python server; every app just contributes routes to it.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

app_name=$1

usage() {
    echo "Usage: $0 <app_name>"
    exit 1
}

[ -z "$app_name" ] && usage

if ! [[ "$app_name" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
    echo "app_name must be lowercase alphanumeric with dashes, e.g. 'my-app'"
    exit 1
fi

# Python module/package names can't contain dashes — use an underscored
# module name internally while keeping the dashed name in the URL and on disk
# label, consistent with the nodejs side.
module_name="${app_name//-/_}"

python_dir="$ROOT_DIR/entry/python"
target="$python_dir/apps/$module_name"
main_py="$python_dir/common/server.py"

if [ -e "$target" ]; then
    echo "Refusing to overwrite existing app: $target"
    exit 1
fi

if grep -q "apps.${module_name}.routers" "$main_py"; then
    echo "App '$app_name' is already registered in $main_py"
    exit 1
fi

mkdir -p "$target"
touch "$target/__init__.py"

cat > "$target/services.py" <<'EOF'
from uuid import uuid4

_items: dict[str, dict] = {}


def list_items() -> list[dict]:
    return list(_items.values())


def get_item(item_id: str) -> dict | None:
    return _items.get(item_id)


def create_item(name: str) -> dict:
    item = {"id": str(uuid4()), "name": name}
    _items[item["id"]] = item
    return item


def delete_item(item_id: str) -> bool:
    return _items.pop(item_id, None) is not None
EOF

cat > "$target/routers.py" <<EOF
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from . import services

router = APIRouter(tags=["${app_name}"])


class ItemCreate(BaseModel):
    name: str = Field(min_length=1)


class Item(ItemCreate):
    id: str


@router.get("/items")
def list_items() -> list[Item]:
    return services.list_items()


@router.get("/items/{item_id}")
def get_item(item_id: str) -> Item:
    item = services.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
    return item


@router.post("/items", status_code=201)
def create_item(payload: ItemCreate) -> Item:
    return services.create_item(payload.name)


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: str):
    if not services.delete_item(item_id):
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
EOF

import_line="from apps.${module_name}.routers import router as ${module_name}_router"
mount_line="app.include_router(${module_name}_router, prefix=\"/app/py/${app_name}/api\")"

awk -v ins="$import_line" '
/# apiforge:app-imports:end/ { print ins }
{ print }
' "$main_py" > "$main_py.tmp" && mv "$main_py.tmp" "$main_py"

awk -v ins="$mount_line" '
/# apiforge:app-mounts:end/ { print ins }
{ print }
' "$main_py" > "$main_py.tmp" && mv "$main_py.tmp" "$main_py"

echo "Created '$app_name' (python) at $target"
echo "Registered its router in $main_py"
echo "Next steps:"
echo "  cd $python_dir && python3 -m venv .venv && source .venv/bin/activate"
echo "  pip install -r requirements.txt"
echo "  uvicorn common.server:app --reload --port 8000"
echo "  curl http://localhost:8000/app/py/$app_name/api/items"
