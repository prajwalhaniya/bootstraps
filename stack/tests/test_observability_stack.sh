# stack/tests/test_observability_stack.sh
prereq::require_cmd "docker" || { log::warn "docker not available, skipping observability stack test"; return 0; }

COMPOSE="stack/observability/docker-compose.yml"
docker compose -f "$COMPOSE" config --quiet; assert_success "$?" "compose file is valid"

docker compose -f "$COMPOSE" down -v >/dev/null 2>&1
docker compose -f "$COMPOSE" up -d

for i in $(seq 1 30); do
  curl -sf http://localhost:4318/v1/traces -X POST -H 'Content-Type: application/json' -d '{"resourceSpans":[]}' >/dev/null 2>&1 && break
  sleep 1
done
curl -sf -o /dev/null -w '%{http_code}' http://localhost:4318/v1/traces -X POST -H 'Content-Type: application/json' -d '{"resourceSpans":[]}' | grep -q '^2'
assert_success "$?" "otel-collector accepts an empty OTLP/HTTP traces POST"

curl -sf http://localhost:3200/ready >/dev/null 2>&1; assert_success "$?" "tempo reports ready"

# Loki holds its ingester "not ready" for ~15s after boot by design, so poll
# instead of checking once.
for i in $(seq 1 30); do
  curl -sf http://localhost:3100/ready >/dev/null 2>&1 && break
  sleep 1
done
curl -sf http://localhost:3100/ready >/dev/null 2>&1; assert_success "$?" "loki reports ready"

docker compose -f "$COMPOSE" down -v >/dev/null 2>&1
