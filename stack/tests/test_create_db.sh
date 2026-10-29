# stack/tests/test_create_db.sh
prereq::require_cmd "docker" || { log::warn "docker not available, skipping create-db tests"; return 0; }

docker rm -f stack-test-pg >/dev/null 2>&1
docker run -d --rm --name stack-test-pg -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:16-alpine >/dev/null
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

docker stop stack-test-pg >/dev/null 2>&1
