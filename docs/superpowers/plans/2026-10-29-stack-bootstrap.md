# Stack Bootstrap (Pigsty Postgres + Node/TS/OTel Observability) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `stack/` bootstrap: a once-per-machine/server installer for Postgres (via Pigsty) + an observability add-on (OTel Collector, Tempo, Loki wired into Pigsty's own Grafana/Prometheus), plus a fast per-project script that provisions a DB/role and a Node/TS OpenTelemetry module that any bootstrapped app can import.

**Architecture:** Two idempotent entrypoints (`bootstrap.sh`, `new-project.sh`) built on a small shared shell library (`lib/common.sh`) for host targeting (local vs. `user@host` over SSH) and prerequisite checks. Postgres bootstrap (`database/`) wraps Pigsty's own installer; observability bootstrap (`observability/`) is a Docker Compose stack (otel-collector + tempo + loki only — Grafana/Prometheus stay Pigsty's). The Node/TS side is a standalone package (`observability/node/`) that reads two env vars and starts `@opentelemetry/sdk-node`.

**Tech Stack:** Bash (scripts + a hand-rolled zero-dependency test harness — no bats/shellcheck available in this environment), Docker Compose, `@opentelemetry/sdk-node` + `auto-instrumentations-node` on Node/TS with Vitest for tests.

**Spec:** `stack/requirements.md`

## Global Constraints

- Pigsty is Linux-only. "Local" means a Linux target reachable the same way a remote one is (SSH, or a no-op local exec for `127.0.0.1`/`local`) — never bare macOS. (spec: Constraint to flag explicitly)
- One shared Pigsty instance (Postgres + its bundled Prometheus + Grafana) per machine/server — never a second Postgres/Prometheus/Grafana per project. (spec: Architecture decisions)
- One shared OTel Collector + Tempo + Loki per machine/server, reusing Pigsty's Grafana as the single UI — apps are told apart by `OTEL_SERVICE_NAME`, not by separate stacks. (spec: Architecture decisions)
- Both entrypoints are idempotent by default: re-running must skip/no-op what already exists rather than failing or duplicating. (spec: Goals, Anti-goals)
- Out of scope this pass: HA/multi-node Postgres, Go/Python instrumentation, TLS/auth hardening. (spec: Non-goals)
- The exact Pigsty CLI incantation and Pigsty's Grafana provisioning directory are implementation details that drift with Pigsty's version — centralize each in exactly one place so a future bump touches one spot. (spec: What's left to the builder)

## Review Focus

- Project name with characters invalid for a Postgres identifier (hyphens, leading digit, uppercase, reserved word) passed to `new-project.sh`/`create-db.sh` — must fail with a clear message, not create a broken role/DB or silently mangle the name.
- `new-project.sh`/`create-db.sh` run twice for the same project — must return the *same* `DATABASE_URL` (same password) rather than erroring on "already exists" or silently generating a second, mismatched password.
- Required external tool missing (`docker`, `ssh`, `psql`) on the machine running a script — must fail fast with a plain "X is required" message, not a cryptic error three steps into an install.
- `--host` value that is neither `local` nor `user@host` shaped — must be rejected before anything is attempted against it.
- Node app imports `observability/node/instrumentation.ts` without `OTEL_EXPORTER_OTLP_ENDPOINT` set (forgot to paste the `.env` block) — must warn loudly once and continue running the app, not crash and not silently do nothing with no signal.

---

## File Structure

```
stack/
  requirements.md                 (already exists)
  bootstrap.sh                    Task 8 - machine bootstrap entrypoint
  new-project.sh                  Task 6 - per-project entrypoint
  lib/
    common.sh                     Task 1 - logging, host targeting, prereq checks
  database/
    install-pigsty.sh             Task 2 - idempotent Pigsty install wrapper
    create-db.sh                  Task 3 - idempotent DB+role creation
  observability/
    docker-compose.yml            Task 4 - otel-collector + tempo + loki
    otel-collector-config.yaml    Task 4
    grafana-provisioning/
      datasources/stack-observability.yml   Task 4
    install-stack.sh              Task 5 - idempotent compose-up wrapper + Grafana wiring
    node/
      package.json                Task 7
      tsconfig.json                Task 7
      instrumentation.ts           Task 7
      instrumentation.test.ts      Task 7
      README.md                    Task 7
  tests/
    harness.sh                    Task 1 - zero-dependency assertion helpers + runner
    run.sh                        Task 1 - runs every test_*.sh
    test_common.sh                Task 1
    test_install_pigsty.sh        Task 2
    test_create_db.sh             Task 3
    test_observability_stack.sh   Task 4
    test_install_stack.sh         Task 5
    test_new_project.sh           Task 6
    test_bootstrap.sh             Task 8
  .gitignore                      Task 3 - ignore .state/
```

---

### Task 1: Shared shell library + test harness

**Files:**
- Create: `stack/lib/common.sh`
- Create: `stack/tests/harness.sh`
- Create: `stack/tests/run.sh`
- Test: `stack/tests/test_common.sh`

**Interfaces:**
- Produces (used by every later bash task):
  - `log::info "$msg"`, `log::warn "$msg"`, `log::error "$msg"` — print to stderr, prefixed `[info]`/`[warn]`/`[error]`.
  - `target::is_local "$host"` — returns 0 if `$host` is `local` or `127.0.0.1`, 1 otherwise.
  - `target::validate "$host"` — exits 1 via `log::error` if `$host` is not `local`/`127.0.0.1` and doesn't match `^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$`; otherwise returns 0.
  - `target::run "$host" "$cmd"` — if `target::is_local "$host"`, runs `bash -c "$cmd"`; else runs `ssh "$host" "$cmd"`. Returns the command's exit code.
  - `target::copy "$host" "$local_path" "$remote_path"` — if local, `cp "$local_path" "$remote_path"`; else `scp "$local_path" "$host:$remote_path"`.
  - `prereq::require_cmd "$cmd_name"` — exits 1 via `log::error` (`"$cmd_name is required but was not found on PATH"`) if `command -v "$cmd_name"` fails; else returns 0.
- `stack/tests/harness.sh` produces: `assert_eq expected actual msg`, `assert_success "$?" msg`, `assert_failure "$?" msg`, `assert_contains haystack needle msg` — each prints `ok - msg` or `not ok - msg` plus a diff, and increments a pass/fail counter; `harness::summary` prints totals and returns nonzero if any failed.
- `stack/tests/run.sh` produces: sources `harness.sh`, then every `stack/tests/test_*.sh` in the directory, calls `harness::summary` at the end, exits with its status.

- [ ] **Step 1: Write the failing test**

```bash
# stack/tests/test_common.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/common.sh"

target::is_local "local"; assert_success "$?" "is_local: 'local' is local"
target::is_local "127.0.0.1"; assert_success "$?" "is_local: '127.0.0.1' is local"
target::is_local "user@server"; assert_failure "$?" "is_local: 'user@server' is not local"

target::validate "local" 2>/dev/null; assert_success "$?" "validate: 'local' is valid"
target::validate "deploy@my-box.example.com" 2>/dev/null; assert_success "$?" "validate: user@host is valid"
( target::validate "not a host" ) 2>/dev/null; assert_failure "$?" "validate: rejects malformed host"

out=$(target::run "local" "echo hello-from-target-run")
assert_eq "hello-from-target-run" "$out" "target::run executes locally for host=local"

prereq::require_cmd "bash" 2>/dev/null; assert_success "$?" "require_cmd: finds an existing command"
( prereq::require_cmd "totally-bogus-cmd-xyz" ) 2>/dev/null; assert_failure "$?" "require_cmd: fails on a missing command"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash stack/tests/run.sh`
Expected: FAIL — `stack/lib/common.sh: No such file or directory` (or sourcing error), since neither file exists yet.

- [ ] **Step 3: Implement `stack/lib/common.sh` and `stack/tests/harness.sh` / `stack/tests/run.sh`**

Plain functions as specified in Interfaces above. `target::validate` should `log::error` and `return 1` (not `exit`, so it's testable in a subshell without killing the test runner) when called directly; scripts that use it in their own `main` are the ones that `exit 1` on failure.

- [ ] **Step 4: Run test to verify it passes**

Run: `bash stack/tests/run.sh`
Expected: PASS — every `ok` line, summary shows 0 failed.

- [ ] **Step 5: Commit**

```bash
git add stack/lib/common.sh stack/tests/harness.sh stack/tests/run.sh stack/tests/test_common.sh
git commit -m "feat(stack): add shared shell library and zero-dependency test harness"
```

---

### Task 2: Pigsty install wrapper

**Files:**
- Create: `stack/database/install-pigsty.sh`
- Test: `stack/tests/test_install_pigsty.sh`

**Interfaces:**
- Consumes: `log::*`, `target::validate`, `target::run`, `prereq::require_cmd` from Task 1 (`stack/lib/common.sh`).
- Produces: `pigsty::install_cmd()` — pure function, echoes the multi-line shell command string that installs Pigsty (installer curl, `./configure`, `./install.yml`), used both for real execution and for `--dry-run` output. CLI: `install-pigsty.sh --host <local|user@host> [--dry-run] [--force]`.

- [ ] **Step 1: Write the failing test**

```bash
# stack/tests/test_install_pigsty.sh
SCRIPT="$(dirname "${BASH_SOURCE[0]}")/../database/install-pigsty.sh"
source "$SCRIPT" --source-only 2>/dev/null || true   # allow sourcing for pigsty::install_cmd

out=$(bash "$SCRIPT" --host local --dry-run)
assert_contains "$out" "install.yml" "dry-run prints the install.yml step"

bash "$SCRIPT" --host local --dry-run >/dev/null; assert_success "$?" "dry-run on a valid local host exits 0"

( bash "$SCRIPT" --host "not a host" --dry-run ) 2>/dev/null
assert_failure "$?" "rejects a malformed --host before doing anything"

( bash "$SCRIPT" --dry-run ) 2>/dev/null
assert_failure "$?" "requires --host"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash stack/tests/run.sh`
Expected: FAIL — script doesn't exist.

- [ ] **Step 3: Implement `stack/database/install-pigsty.sh`**

Structure: source `../lib/common.sh`; define `pigsty::install_cmd()` returning the install steps as one string (curl installer per Pigsty's docs, `./configure`, `./install.yml` — verify exact current incantation against Pigsty's own docs at build time rather than trusting a memorized command, but keep it confined to this one function); `main()` parses `--host`/`--dry-run`/`--force`, calls `target::validate "$host"` (exit 1 on failure), requires `ssh`/`bash` via `prereq::require_cmd`, and:
  - if `--dry-run`: print `pigsty::install_cmd` output, exit 0.
  - else: `target::run "$host" '[ -d ~/pigsty ] && echo PRESENT || echo ABSENT'`; if `PRESENT` and not `--force`, `log::info` "already installed, skipping" and exit 0; otherwise `target::run "$host" "$(pigsty::install_cmd)"`.
  Guard `main "$@"` behind `if [[ "${BASH_SOURCE[0]}" == "${0}" ]]`, so the test's `source` for `pigsty::install_cmd` doesn't also execute `main`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bash stack/tests/run.sh`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add stack/database/install-pigsty.sh stack/tests/test_install_pigsty.sh
git commit -m "feat(stack): add idempotent Pigsty install wrapper"
```

---

### Task 3: Database + role creation (`create-db.sh`)

**Files:**
- Create: `stack/database/create-db.sh`
- Create: `stack/.gitignore` (contents: `.state/`)
- Test: `stack/tests/test_create_db.sh`

**Interfaces:**
- Consumes: `log::*`, `prereq::require_cmd` from Task 1.
- Produces: CLI `create-db.sh <project_name> --admin-dsn <postgres_dsn> [--state-dir <dir, default stack/.state>]`. On success, prints exactly one line to stdout: `DATABASE_URL=postgres://<project_name>:<password>@<host>:<port>/<project_name>` (host/port taken from `--admin-dsn`). Exit 0 on success (including the idempotent "already exists" case), exit 1 with a `log::error` message on an invalid name or on an existing role with no matching state file.

- [ ] **Step 1: Write the failing test**

```bash
# stack/tests/test_create_db.sh
prereq::require_cmd "docker" || { log::warn "docker not available, skipping create-db tests"; return 0; }

docker run -d --rm --name stack-test-pg -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:16-alpine >/dev/null
trap 'docker stop stack-test-pg >/dev/null 2>&1' EXIT
# wait for readiness
for i in $(seq 1 30); do docker exec stack-test-pg pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done

ADMIN_DSN="postgres://postgres:postgres@localhost:55432/postgres"
STATE_DIR="$(mktemp -d)"
SCRIPT="$(dirname "${BASH_SOURCE[0]}")/../database/create-db.sh"

out=$(bash "$SCRIPT" myapp --admin-dsn "$ADMIN_DSN" --state-dir "$STATE_DIR")
assert_contains "$out" "DATABASE_URL=postgres://myapp:" "first run prints a DATABASE_URL for myapp"

url=$(echo "$out" | sed 's/^DATABASE_URL=//')
psql "$url" -c "select 1" >/dev/null 2>&1; assert_success "$?" "printed DATABASE_URL is a working connection"

out2=$(bash "$SCRIPT" myapp --admin-dsn "$ADMIN_DSN" --state-dir "$STATE_DIR")
assert_eq "$out" "$out2" "re-running returns the identical DATABASE_URL (same password)"

( bash "$SCRIPT" "My-Bad-Name!" --admin-dsn "$ADMIN_DSN" --state-dir "$STATE_DIR" ) 2>/dev/null
assert_failure "$?" "rejects an invalid Postgres identifier"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash stack/tests/run.sh`
Expected: FAIL — script doesn't exist.

- [ ] **Step 3: Implement `stack/database/create-db.sh`**

Validate `project_name` against `^[a-z][a-z0-9_]{0,62}$`, else `log::error` + exit 1. If `"$state_dir/$project_name.env"` exists, source it and re-print the stored `DATABASE_URL` (confirming the role still exists via `psql "$admin_dsn" -tAc "select 1 from pg_roles where rolname='$project_name'"`; if the state file exists but the role doesn't, `log::error` "state file present but role missing — resolve manually" and exit 1). Otherwise, check the role doesn't already exist unmanaged (same query); if it does, `log::error` and exit 1. Else generate a password (`openssl rand -base64 24 | tr -d '/+=' | cut -c1-32` or equivalent), run `CREATE ROLE "$project_name" LOGIN PASSWORD '...'` and `CREATE DATABASE "$project_name" OWNER "$project_name"` via `psql "$admin_dsn"`, derive host/port from `$admin_dsn`, write `$state_dir/$project_name.env` containing `DATABASE_URL=...`, print that line.

- [ ] **Step 4: Run test to verify it passes**

Run: `bash stack/tests/run.sh`
Expected: PASS (or a `skip`-style pass-through with a logged warning if Docker isn't available in the executing environment — don't hard-fail the whole suite over a missing optional dependency).

- [ ] **Step 5: Commit**

```bash
git add stack/database/create-db.sh stack/.gitignore stack/tests/test_create_db.sh
git commit -m "feat(stack): add idempotent per-project database/role creation"
```

---

### Task 4: Observability Docker Compose stack

**Files:**
- Create: `stack/observability/docker-compose.yml`
- Create: `stack/observability/otel-collector-config.yaml`
- Create: `stack/observability/grafana-provisioning/datasources/stack-observability.yml`
- Test: `stack/tests/test_observability_stack.sh`

**Interfaces:**
- Produces: a compose project (service names `otel-collector`, `tempo`, `loki`) exposing `4317` (OTLP gRPC), `4318` (OTLP HTTP), `3200` (Tempo query), `3100` (Loki). `otel-collector-config.yaml` reads `PROMETHEUS_REMOTE_WRITE_URL` (default `http://host.docker.internal:9090/api/v1/write`, i.e. Pigsty's Prometheus) from the environment for its `prometheusremotewrite` exporter. `grafana-provisioning/datasources/stack-observability.yml` is a standalone file later copied onto the Pigsty host by Task 5 — not consumed by this compose file itself.

- [ ] **Step 1: Write the failing test**

```bash
# stack/tests/test_observability_stack.sh
prereq::require_cmd "docker" || { log::warn "docker not available, skipping observability stack test"; return 0; }

COMPOSE="stack/observability/docker-compose.yml"
docker compose -f "$COMPOSE" config --quiet; assert_success "$?" "compose file is valid"

docker compose -f "$COMPOSE" up -d
trap 'docker compose -f "'"$COMPOSE"'" down -v >/dev/null 2>&1' EXIT

for i in $(seq 1 30); do
  curl -sf http://localhost:4318/v1/traces -X POST -H 'Content-Type: application/json' -d '{"resourceSpans":[]}' >/dev/null 2>&1 && break
  sleep 1
done
curl -sf -o /dev/null -w '%{http_code}' http://localhost:4318/v1/traces -X POST -H 'Content-Type: application/json' -d '{"resourceSpans":[]}' | grep -q '^2'
assert_success "$?" "otel-collector accepts an empty OTLP/HTTP traces POST"

curl -sf http://localhost:3200/ready >/dev/null 2>&1; assert_success "$?" "tempo reports ready"
curl -sf http://localhost:3100/ready >/dev/null 2>&1; assert_success "$?" "loki reports ready"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash stack/tests/run.sh`
Expected: FAIL — compose file doesn't exist.

- [ ] **Step 3: Implement the compose file + collector config + datasource provisioning**

Pin exact, current stable image tags for `otel/opentelemetry-collector-contrib`, `grafana/tempo`, `grafana/loki` (verify the latest stable tag at implementation time rather than trusting a memorized version — centralize each tag as a single `image:` line so bumping later is a one-line change). Collector config: `receivers.otlp` (grpc `0.0.0.0:4317`, http `0.0.0.0:4318`), `processors.batch`, `exporters.otlp/tempo` → `tempo:4317`, `exporters.loki` → `http://loki:3100/loki/api/v1/push`, `exporters.prometheusremotewrite` → `${PROMETHEUS_REMOTE_WRITE_URL}`; pipelines wiring traces/logs/metrics to those exporters respectively. Datasource file: two Grafana `datasources` entries, `type: tempo` and `type: loki`, pointed at `http://localhost:3200` / `http://localhost:3100` (the hostnames resolvable from wherever Grafana actually runs — flag for Task 5 to confirm against the real Pigsty host).

- [ ] **Step 4: Run test to verify it passes**

Run: `bash stack/tests/run.sh`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add stack/observability/docker-compose.yml stack/observability/otel-collector-config.yaml stack/observability/grafana-provisioning stack/tests/test_observability_stack.sh
git commit -m "feat(stack): add otel-collector/tempo/loki compose stack"
```

---

### Task 5: Observability install wrapper + Grafana wiring

**Files:**
- Create: `stack/observability/install-stack.sh`
- Test: `stack/tests/test_install_stack.sh`

**Interfaces:**
- Consumes: `log::*`, `target::validate`, `target::run`, `target::copy`, `prereq::require_cmd` (Task 1); `stack/observability/docker-compose.yml` + `otel-collector-config.yaml` + `grafana-provisioning/datasources/stack-observability.yml` (Task 4).
- Produces: CLI `install-stack.sh --host <local|user@host> [--prometheus-remote-write-url <url>] [--grafana-provisioning-dir <dir, default /etc/grafana/provisioning/datasources>]`. Exit 0 on success; non-fatal `log::warn` (not exit 1) if the Grafana reload step fails, since the exact Grafana service name can vary by Pigsty version.

- [ ] **Step 1: Write the failing test**

```bash
# stack/tests/test_install_stack.sh
prereq::require_cmd "docker" || { log::warn "docker not available, skipping install-stack test"; return 0; }

PROV_DIR="$(mktemp -d)"
SCRIPT="$(dirname "${BASH_SOURCE[0]}")/../observability/install-stack.sh"

bash "$SCRIPT" --host local --grafana-provisioning-dir "$PROV_DIR"
assert_success "$?" "install-stack.sh runs end to end against a local host"

docker compose -f stack/observability/docker-compose.yml ps --status running --quiet | wc -l | grep -q '^3$'
assert_success "$?" "all three containers (otel-collector, tempo, loki) are running"

assert_contains "$(cat "$PROV_DIR"/stack-observability.yml)" "type: tempo" "datasource file was copied to the provisioning dir"

docker compose -f stack/observability/docker-compose.yml down -v >/dev/null 2>&1

( bash "$SCRIPT" --host "not a host" ) 2>/dev/null
assert_failure "$?" "rejects a malformed --host"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash stack/tests/run.sh`
Expected: FAIL — script doesn't exist.

- [ ] **Step 3: Implement `stack/observability/install-stack.sh`**

Parse args, `target::validate "$host"`, `prereq::require_cmd docker`. If `target::is_local "$host"`: `docker compose -f stack/observability/docker-compose.yml up -d` directly, `cp` the datasource file into `--grafana-provisioning-dir` (creating it if missing). Else: `target::copy` the compose file + collector config to `~/stack-observability/` on the host, `target::run "$host" "cd ~/stack-observability && PROMETHEUS_REMOTE_WRITE_URL=... docker compose up -d"`, `target::copy` the datasource file into the remote provisioning dir, then `target::run "$host" "systemctl reload grafana-server"` wrapped so a failure there is `log::warn` + continue, not exit 1 (document the manual fallback in the warning message itself).

- [ ] **Step 4: Run test to verify it passes**

Run: `bash stack/tests/run.sh`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add stack/observability/install-stack.sh stack/tests/test_install_stack.sh
git commit -m "feat(stack): add idempotent observability stack installer with Grafana wiring"
```

---

### Task 6: Per-project entrypoint (`new-project.sh`)

**Files:**
- Create: `stack/new-project.sh`
- Test: `stack/tests/test_new_project.sh`

**Interfaces:**
- Consumes: `log::*` (Task 1); `stack/database/create-db.sh` CLI contract (Task 3) — invoked as a subprocess, its single `DATABASE_URL=...` stdout line captured.
- Produces: CLI `new-project.sh <project_name> [--admin-dsn <dsn>, default $PIGSTY_ADMIN_DSN] [--otel-endpoint <url>, default $STACK_OTEL_ENDPOINT or http://localhost:4318] [--state-dir <dir>, default stack/.state]`. Prints exactly three lines to stdout:
  ```
  DATABASE_URL=postgres://...
  OTEL_SERVICE_NAME=<project_name>
  OTEL_EXPORTER_OTLP_ENDPOINT=<otel_endpoint>
  ```

- [ ] **Step 1: Write the failing test**

```bash
# stack/tests/test_new_project.sh
prereq::require_cmd "docker" || { log::warn "docker not available, skipping new-project test"; return 0; }
# reuse the same throwaway postgres container pattern as test_create_db.sh
docker run -d --rm --name stack-test-pg2 -e POSTGRES_PASSWORD=postgres -p 55433:5432 postgres:16-alpine >/dev/null
trap 'docker stop stack-test-pg2 >/dev/null 2>&1' EXIT
for i in $(seq 1 30); do docker exec stack-test-pg2 pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done

STATE_DIR="$(mktemp -d)"
SCRIPT="$(dirname "${BASH_SOURCE[0]}")/../new-project.sh"
out=$(bash "$SCRIPT" demoapp --admin-dsn "postgres://postgres:postgres@localhost:55433/postgres" --otel-endpoint "http://example:4318" --state-dir "$STATE_DIR")

assert_contains "$out" "DATABASE_URL=postgres://demoapp:" "prints a DATABASE_URL for demoapp"
assert_contains "$out" "OTEL_SERVICE_NAME=demoapp" "prints the project name as the service name"
assert_contains "$out" "OTEL_EXPORTER_OTLP_ENDPOINT=http://example:4318" "prints the given otel endpoint"

out2=$(bash "$SCRIPT" demoapp --admin-dsn "postgres://postgres:postgres@localhost:55433/postgres" --otel-endpoint "http://example:4318" --state-dir "$STATE_DIR")
assert_eq "$out" "$out2" "re-running prints the identical block"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash stack/tests/run.sh`
Expected: FAIL — script doesn't exist.

- [ ] **Step 3: Implement `stack/new-project.sh`**

Parse args/defaults, call `bash "$(dirname "$0")/database/create-db.sh" "$project_name" --admin-dsn "$admin_dsn" --state-dir "$state_dir"`, propagate its exit code on failure, else print the captured `DATABASE_URL=...` line followed by `OTEL_SERVICE_NAME=$project_name` and `OTEL_EXPORTER_OTLP_ENDPOINT=$otel_endpoint`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bash stack/tests/run.sh`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add stack/new-project.sh stack/tests/test_new_project.sh
git commit -m "feat(stack): add per-project database + env block entrypoint"
```

---

### Task 7: Node/TS OpenTelemetry instrumentation module

**Files:**
- Create: `stack/observability/node/package.json`
- Create: `stack/observability/node/tsconfig.json`
- Create: `stack/observability/node/instrumentation.ts`
- Test: `stack/observability/node/instrumentation.test.ts`
- Create: `stack/observability/node/README.md`

**Interfaces:**
- Consumes: `process.env.OTEL_SERVICE_NAME`, `process.env.OTEL_EXPORTER_OTLP_ENDPOINT` (the exact two names `new-project.sh`, Task 6, prints).
- Produces: default export `sdk: NodeSDK` (so tests/app shutdown hooks can call `sdk.shutdown()`); side effect on import: either (a) `console.warn('[stack-observability] OTEL_EXPORTER_OTLP_ENDPOINT not set — skipping telemetry setup; paste the env block from new-project.sh')` and no SDK start, or (b) `sdk.start()` with OTLP/HTTP exporters at `${endpoint}/v1/traces`, `/v1/metrics`, `/v1/logs`, resource `service.name = process.env.OTEL_SERVICE_NAME || 'unknown-service'`, `instrumentations: [getNodeAutoInstrumentations()]`, protocol forced to `http/json` (readable payloads, and what the test below parses) unless `OTEL_EXPORTER_OTLP_PROTOCOL` is already set.

- [ ] **Step 1: Write the failing test**

```ts
// stack/observability/node/instrumentation.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "node:http";

describe("instrumentation", () => {
  beforeEach(() => { vi.resetModules(); delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT; delete process.env.OTEL_SERVICE_NAME; });

  it("warns and skips setup when OTEL_EXPORTER_OTLP_ENDPOINT is unset", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await import("./instrumentation");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("OTEL_EXPORTER_OTLP_ENDPOINT"));
  });

  it("exports a span containing the configured service name to the configured endpoint", async () => {
    const received: string[] = [];
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => { received.push(body); res.writeHead(200); res.end(); });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    process.env.OTEL_SERVICE_NAME = "demoapp";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `http://localhost:${port}`;
    const { sdk } = await import("./instrumentation");

    const { trace } = await import("@opentelemetry/api");
    trace.getTracer("test").startSpan("test-span").end();
    await sdk.shutdown();

    expect(received.some((b) => b.includes("demoapp"))).toBe(true);
    server.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd stack/observability/node && npm install && npx vitest run`
Expected: FAIL — `instrumentation.ts` doesn't exist.

- [ ] **Step 3: Implement `package.json`, `tsconfig.json`, `instrumentation.ts`**

`package.json` deps: `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/exporter-logs-otlp-http`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`; devDeps: `typescript`, `vitest`, `@types/node`. `tsconfig.json`: mirror the existing `nodejs/tsconfig.json` (`module`/`moduleResolution: NodeNext`, `target: ESNext`) so it's consistent with the sibling bootstrap. `instrumentation.ts`: read the two env vars, branch per Interfaces above, construct and `start()` the `NodeSDK`, register a `SIGTERM` handler calling `sdk.shutdown()`, export `{ sdk }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd stack/observability/node && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add stack/observability/node/package.json stack/observability/node/tsconfig.json stack/observability/node/instrumentation.ts stack/observability/node/instrumentation.test.ts stack/observability/node/README.md
git commit -m "feat(stack): add drop-in Node/TS OpenTelemetry instrumentation module"
```

---

### Task 8: Machine bootstrap entrypoint + docs

**Files:**
- Create: `stack/bootstrap.sh`
- Test: `stack/tests/test_bootstrap.sh`
- Modify: `/README.md` (repo root — add `stack/` to "Available bootstraps")

**Interfaces:**
- Consumes: `log::*`, `target::validate` (Task 1); `database/install-pigsty.sh` CLI (Task 2); `observability/install-stack.sh` CLI (Task 5).
- Produces: CLI `bootstrap.sh --host <local|user@host> [--prometheus-remote-write-url <url>] [--grafana-provisioning-dir <dir>] [--dry-run]` — runs install-pigsty then install-stack, aborting on the first nonzero exit.

- [ ] **Step 1: Write the failing test**

```bash
# stack/tests/test_bootstrap.sh
SCRIPT="$(dirname "${BASH_SOURCE[0]}")/../bootstrap.sh"

out=$(bash "$SCRIPT" --host local --dry-run)
assert_contains "$out" "install.yml" "runs install-pigsty.sh in dry-run mode"
bash "$SCRIPT" --host local --dry-run >/dev/null; assert_success "$?" "dry-run exits 0"

( bash "$SCRIPT" --host "not a host" --dry-run ) 2>/dev/null
assert_failure "$?" "rejects a malformed --host before running either sub-step"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash stack/tests/run.sh`
Expected: FAIL — script doesn't exist.

- [ ] **Step 3: Implement `stack/bootstrap.sh`**

Parse args, `target::validate "$host"`, then `bash "$(dirname "$0")/database/install-pigsty.sh" --host "$host" ${dry_run:+--dry-run}`, propagate failure immediately; when not `--dry-run`, also `bash "$(dirname "$0")/observability/install-stack.sh" --host "$host" --prometheus-remote-write-url "$prom_url" --grafana-provisioning-dir "$grafana_dir"`, propagate failure. (`--dry-run` only exercises the Pigsty step's dry-run output, per Task 2/5 scope — the observability step's own real-vs-dry behavior is covered by its own tests in Task 5.)

- [ ] **Step 4: Run test to verify it passes**

Run: `bash stack/tests/run.sh`
Expected: PASS.

- [ ] **Step 5: Add `stack/` to root `README.md`'s "Available bootstraps" list and commit**

```bash
git add stack/bootstrap.sh stack/tests/test_bootstrap.sh README.md
git commit -m "feat(stack): add machine bootstrap entrypoint tying Pigsty + observability together"
```

---

## Self-Review Notes

- **Spec coverage:** machine bootstrap (Tasks 2, 5, 8), per-project bootstrap (Tasks 3, 6), Node/TS instrumentation (Task 7), idempotency (Tasks 2, 3, 5, 6 tests), local-vs-remote via one code path (Task 1's `target::*`, reused everywhere) are each covered by a task.
- **Review Focus:** all five items map to an owning task's test (invalid name → Task 3; idempotent re-run → Tasks 3 & 6; missing prereq → Task 1's `prereq::require_cmd`, exercised in Tasks 2/5/6; malformed `--host` → Tasks 2/5/8; missing OTEL env var → Task 7).
- **Manual verification still required, documented but not automated here:** the real Pigsty install (`install-pigsty.sh` without `--dry-run`) and the real Grafana datasource reload against a live Pigsty host — both need an actual Linux target, which this environment doesn't have; Tasks 2 and 5 test everything *except* that final real-install/real-reload step, and should each end with a one-line comment pointing at this limitation for whoever runs it against a real server first.
