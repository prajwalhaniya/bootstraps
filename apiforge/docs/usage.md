# Using apiforge

apiforge scaffolds REST APIs in Node.js or Python, entirely from local templates — no network fetch needed when you create a new app.

It's structured like `plug`: **one Node.js server, one Python server.** Each language runs a single long-running process (`common/`) with an `apps/` directory of route modules mounted onto it. Creating a new app never starts a new process on a new port — it adds a router and wires it into the one shared server for that language.

```
apiforge/
  entry/
    nodejs/
      common/        # shared server: app.ts, server.ts, config, middleware, the route aggregator
      apps/
        sample-app/   # routes/ + controllers/ + services/ — no server, no port of its own
    python/
      common/        # shared server: server.py (the route aggregator), config.py, logger.py
      apps/
        sample_app/   # routers.py + services.py — no server, no port of its own
    sidecar/          # separate, fixed Node.js auxiliary process (background jobs, log shipping, etc.)
  scripts/
    bash/
      setup.sh
      create-node-app.sh
      create-python-app.sh
```

## 1. One-time setup

From the `apiforge` root:

```bash
./scripts/bash/setup.sh
```

This:

- Installs Node.js dependencies for `entry/nodejs` and `entry/sidecar` (`pnpm install && pnpm approve-builds --all`)
- Creates `entry/python/.venv` and installs its dependencies (`pip install -r requirements.txt`)
- Creates each project's `.env` from its `.env.example`, without overwriting an existing one

It's safe to re-run at any time, e.g. after pulling changes that touch `package.json` / `requirements.txt`. It exits early with an error if `node`, `pnpm`, or `python3` aren't on your `PATH`.

## 2. Create an app

Each app lives under one shared server per language — you're adding routes, not spinning up a new process.

```bash
./scripts/bash/create-node-app.sh <app_name>
./scripts/bash/create-python-app.sh <app_name>
```

`app_name` must be lowercase alphanumeric with dashes (e.g. `my-api`). The script refuses to run if an app with that name already exists, or is already registered in the aggregator.

Each run:

1. Scaffolds `apps/<app_name>/` with a minimal in-memory CRUD example (`routes/` + `controllers/` + `services/` for Node.js; `routers.py` + `services.py` for Python).
2. Inserts an import line and a mount line into the shared aggregator — `entry/nodejs/common/routes/index.ts` or `entry/python/common/server.py` — between the `apiforge:app-imports` / `apiforge:app-mounts` marker comments. This is the same edit you'd make by hand to register a new plugin's router.

Python app names are kept dashed on disk for the URL and label (`my-api`), but the importable package uses underscores (`apps/my_api`), since Python identifiers can't contain dashes.

## 3. Run a server

Only one process per language runs, regardless of how many apps you've created under `apps/`.

### Node.js

```bash
cd entry/nodejs
pnpm run dev
curl http://localhost:3000/app/js/my-api/api/items
```

### Python

```bash
cd entry/python
source .venv/bin/activate
uvicorn common.server:app --reload --port 8000
curl http://localhost:8000/app/py/my-api/api/items
```

Every app's routes are namespaced under `/app/js/<app_name>/api` (Node.js) or `/app/py/<app_name>/api` (Python). Each server also exposes a single `GET /health` for liveness — not per-app, since there's only one process per language.

## 4. Replace the example logic

Each generated app ships a working `GET/POST /items`, `GET/DELETE /items/:id` CRUD example backed by an in-memory store. Replace it with your own logic:

- Node.js: edit `apps/<app_name>/routes`, `controllers`, and `services`
- Python: edit `apps/<app_name>/routers.py` and `services.py`

## 5. The sidecar

`entry/sidecar` is a separate, fixed Node.js scaffold — not cloned per-app, not part of the `apps/` aggregation. Use it for auxiliary processes that run alongside the two servers: background jobs, log shipping, shared internal utilities.

```bash
cd entry/sidecar
pnpm install && pnpm run dev
```

It exposes `GET /health` as a starting point. See `entry/sidecar/README.md`.

## 6. Debugging in VS Code

`.vscode/launch.json` ships one debug configuration per process:

- "apiforge: Node server (tsx)"
- "apiforge: Node server (compiled build)"
- "apiforge: Python server (uvicorn)"
- "apiforge: Sidecar (tsx)"
- "apiforge: All servers" (compound — starts all three together)

Before debugging, make sure setup has run: `pnpm install` in `entry/nodejs` and `entry/sidecar`, and `entry/python/.venv` created with dependencies installed. The Python config expects the interpreter at `entry/python/.venv/bin/python` and the VS Code Python extension (`ms-python.debugpy`, listed in `.vscode/extensions.json`).

## Stack

| Language | Stack |
|---|---|
| `nodejs` | TypeScript, Express 5, Zod, one shared process |
| `python` | FastAPI, Pydantic Settings, Uvicorn, one shared process |

Node.js source uses 4-space indentation (see `entry/nodejs/.prettierrc` and `entry/sidecar/.prettierrc`).

## Environment variables

Each process reads its own `.env`, created by `setup.sh` from `.env.example`:

| Process | Default port | Vars |
|---|---|---|
| `entry/nodejs` | 3000 | `PORT`, `NODE_ENV`, `LOG_LEVEL` |
| `entry/python` | 8000 | `PORT`, `ENV`, `LOG_LEVEL` |
| `entry/sidecar` | 4000 | `PORT`, `NODE_ENV`, `LOG_LEVEL` |

## Why apiforge instead of bootstraps?

[`bootstraps`](https://github.com/prajwalhn-18/bootstraps) is the git-sparse-checkout-based generator (Node.js/Python/Go/React, TypeORM/SQLAlchemy-backed) that this repo lives alongside. apiforge is a lighter, dependency-free-to-scaffold alternative: templates live locally in this repo, so the create scripts never need network access to generate a new app.
