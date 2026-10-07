#!/bin/bash
# Scaffold a new app under entry/nodejs/apps and wire its router into the
# single shared Node.js server (entry/nodejs/common). There is only one
# Node.js server; every app just contributes routes to it.
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

nodejs_dir="$ROOT_DIR/entry/nodejs"
target="$nodejs_dir/apps/$app_name"
aggregator="$nodejs_dir/common/routes/index.ts"

if [ -e "$target" ]; then
    echo "Refusing to overwrite existing app: $target"
    exit 1
fi

if grep -q "apps/$app_name/routes/index.js" "$aggregator"; then
    echo "App '$app_name' is already registered in $aggregator"
    exit 1
fi

mkdir -p "$target/routes" "$target/controllers" "$target/services"

cat > "$target/services/index.ts" <<'EOF'
import { randomUUID } from "node:crypto";

export interface Item {
    id: string;
    name: string;
}

const items = new Map<string, Item>();

export const itemService = {
    list: (): Item[] => Array.from(items.values()),
    get: (id: string): Item | undefined => items.get(id),
    create: (name: string): Item => {
        const item: Item = { id: randomUUID(), name };
        items.set(item.id, item);
        return item;
    },
    remove: (id: string): boolean => items.delete(id),
};
EOF

cat > "$target/controllers/index.ts" <<'EOF'
import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../../../common/middleware/errorHandler.js";
import { itemService } from "../services/index.js";

const createItemSchema = z.object({
    name: z.string().min(1),
});

export function listItems(_req: Request, res: Response) {
    res.json(itemService.list());
}

export function getItem(req: Request<{ id: string }>, res: Response) {
    const item = itemService.get(req.params.id);
    if (!item) throw new HttpError(404, `Item ${req.params.id} not found`);
    res.json(item);
}

export function createItem(req: Request, res: Response) {
    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    res.status(201).json(itemService.create(parsed.data.name));
}

export function deleteItem(req: Request<{ id: string }>, res: Response) {
    if (!itemService.remove(req.params.id)) throw new HttpError(404, `Item ${req.params.id} not found`);
    res.status(204).send();
}
EOF

cat > "$target/routes/index.ts" <<'EOF'
import { Router } from "express";
import { listItems, getItem, createItem, deleteItem } from "../controllers/index.js";

const router = Router();

router.get("/items", listItems);
router.get("/items/:id", getItem);
router.post("/items", createItem);
router.delete("/items/:id", deleteItem);

export default router;
EOF

# camelCase("my-app") -> "myApp"
camel_case() {
    echo "$1" | awk -F'-' '{
        out = $1
        for (i = 2; i <= NF; i++) {
            part = $i
            out = out toupper(substr(part, 1, 1)) substr(part, 2)
        }
        print out
    }'
}

var_name="$(camel_case "$app_name")Routes"
import_line="import ${var_name} from \"../../apps/${app_name}/routes/index.js\";"
mount_line="router.use(\"/app/js/${app_name}/api\", ${var_name});"

awk -v ins="$import_line" '
/\/\/ apiforge:app-imports:end/ { print ins }
{ print }
' "$aggregator" > "$aggregator.tmp" && mv "$aggregator.tmp" "$aggregator"

awk -v ins="$mount_line" '
/\/\/ apiforge:app-mounts:end/ { print ins }
{ print }
' "$aggregator" > "$aggregator.tmp" && mv "$aggregator.tmp" "$aggregator"

echo "Created '$app_name' (nodejs) at $target"
echo "Registered its router in $aggregator"
echo "Next steps:"
echo "  cd $nodejs_dir && pnpm install && pnpm run dev"
echo "  curl http://localhost:3000/app/js/$app_name/api/items"
