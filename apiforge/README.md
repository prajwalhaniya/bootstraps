# apiforge

Scaffold REST APIs in Node.js or Python, locally — no network fetch needed.

Structured like `plug`: **one Node.js server, one Python server.** Each language has a single long-running server (`common/`) and an `apps/` directory of route modules; creating a new app doesn't start a new process on a new port — it adds a router and wires it into the one server for that language, like `plug`'s `src/typescript/routes/plug.ts` mounting every plugin's routes onto its single Express app.

```
apiforge/
  entry/
    nodejs/
      package.json, tsconfig.json   # one project for the whole server
      common/        # shared server: app.ts, server.ts, config, middleware, the route aggregator
      apps/
        sample-app/  # routes/ + controllers/ + services/ — no server, no port of its own
    python/
      requirements.txt
      common/        # shared server: server.py (the route aggregator), config.py, logger.py
      apps/
        sample_app/  # routers.py + services.py — no server, no port of its own
    sidecar/         # separate, fixed Node.js auxiliary process (not part of the apps/ aggregation)
  scripts/
    bash/
      create-node-app.sh
      create-python-app.sh
```

## How it fits together

`entry/nodejs/common/routes/index.ts` and `entry/python/common/server.py` are **aggregators**: every app's router gets imported and mounted there, under `/app/js/<app_name>/api` (Node.js) or `/app/py/<app_name>/api` (Python). The create scripts generate the app's files *and* insert its import/mount lines into the aggregator automatically, between `apiforge:app-imports`/`apiforge:app-mounts` marker comments — the same thing you'd do by hand if you were copying `plug`'s pattern of adding a new `router.use("/plugin-x", x_routes)` line.

There is exactly one `pnpm run dev` and one `uvicorn ... --reload` per language, regardless of how many apps exist under `apps/`.

## Setup

```bash
./scripts/bash/setup.sh
```

Installs Node.js deps for `entry/nodejs` and `entry/sidecar`, creates `entry/python/.venv` and installs its Python deps, and creates each project's `.env` from its `.env.example` (never overwriting one that already exists). Safe to re-run any time — e.g. after pulling changes that touch `package.json`/`requirements.txt`.

## Usage

```bash
./scripts/bash/create-node-app.sh <app_name>
./scripts/bash/create-python-app.sh <app_name>
```

Example (after running `setup.sh` once):

```bash
./scripts/bash/create-node-app.sh my-api
cd entry/nodejs && pnpm run dev
curl http://localhost:3000/app/js/my-api/api/items
```

```bash
./scripts/bash/create-python-app.sh my-api
cd entry/python && source .venv/bin/activate
uvicorn common.server:app --reload --port 8000
curl http://localhost:8000/app/py/my-api/api/items
```

Each generated app ships a minimal in-memory CRUD example (`GET/POST /items`, `GET/DELETE /items/:id`) to replace with your own logic — edit `apps/<app_name>/routes` + `controllers` + `services` (Node.js) or `apps/<app_name>/routers.py` + `services.py` (Python). A single `GET /health` on each server (not per-app) reports liveness.

Python app names are kept dashed on disk for the URL and label (`my-api`), but the importable package uses underscores (`apps/my_api`) since Python identifiers can't contain dashes.

## Stack

| Language | Stack |
|---|---|
| `nodejs` | TypeScript, Express 5, Zod, one shared process |
| `python` | FastAPI, Pydantic Settings, Uvicorn, one shared process |

Node.js source uses 4-space indentation (see `entry/nodejs/.prettierrc` and `entry/sidecar/.prettierrc`).

## Debugging (VS Code)

`.vscode/launch.json` has one debug config per process — "apiforge: Node server (tsx)", "apiforge: Node server (compiled build)", "apiforge: Python server (uvicorn)", "apiforge: Sidecar (tsx)" — plus a compound "apiforge: All servers" to start all three together. Run `pnpm install` in `entry/nodejs`/`entry/sidecar` and create `entry/python/.venv` (`pip install -r requirements.txt`) first; the Python config expects `entry/python/.venv/bin/python` and the VS Code Python extension (`ms-python.debugpy`, in `.vscode/extensions.json`).

## `sidecar`

`entry/sidecar` is a separate, fixed Node.js scaffold (not cloned per-app, not part of the `apps/` aggregation) for auxiliary processes that run alongside the two servers — background jobs, log shipping, shared internal utilities. See `entry/sidecar/README.md`.

## Why a separate repo from `bootstraps`

[`bootstraps`](https://github.com/prajwalhn-18/bootstraps) is the git-sparse-checkout-based generator (nodejs/python/go/React, TypeORM/SQLAlchemy-backed). `apiforge` is a lighter, dependency-free-to-scaffold alternative — templates live locally in this repo, so the create scripts never need network access.
