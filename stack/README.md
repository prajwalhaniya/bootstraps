# stack

Postgres + observability, set up once per machine/server, then used by every project you build.

- **Postgres** — a single [Pigsty](https://pigsty.io) instance per machine/server. Every project gets its own database and role on it, not its own Postgres install.
- **Observability** — one shared OTel Collector + Tempo (traces) + Loki (logs) stack, wired into Pigsty's own Grafana + Prometheus. Every project/service is told apart by its `OTEL_SERVICE_NAME`, not a separate stack.

## Run once per machine/server

```bash
bash stack/database/install-pigsty.sh --host local      # or: --host user@my-server
bash stack/observability/install-stack.sh --host local  # or: --host user@my-server
```

Both are safe to re-run — they detect what's already installed/running and skip or update instead of failing or duplicating.

## Every time you start a new project

```bash
bash stack/database/create-db.sh my-new-app --admin-dsn "$PIGSTY_ADMIN_DSN"
```

Prints a `DATABASE_URL` for `my-new-app`, backed by its own Postgres role. Re-running it for the same project name returns the same URL instead of erroring.

## Tests

```bash
bash stack/tests/run.sh
```

Runs the whole suite (needs Docker; spins up throwaway containers and tears them down).

## Coming next

- `new-project.sh` — wraps `create-db.sh` and also prints the `OTEL_SERVICE_NAME` / `OTEL_EXPORTER_OTLP_ENDPOINT` lines, so you get one env block to paste and you're done.
- A drop-in Node/TS OpenTelemetry module under `observability/node/` — one import, reads that env block, ships traces/metrics/logs automatically.
- `bootstrap.sh` — a single top-level command that runs both "once per machine" steps above together.
