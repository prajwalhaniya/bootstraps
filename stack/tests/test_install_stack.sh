# stack/tests/test_install_stack.sh
prereq::require_cmd "docker" || { log::warn "docker not available, skipping install-stack test"; return 0; }

PROV_DIR="$(mktemp -d)"
SCRIPT="$(dirname "${BASH_SOURCE[0]}")/../observability/install-stack.sh"

bash "$SCRIPT" --host local --grafana-provisioning-dir "$PROV_DIR"
assert_success "$?" "install-stack.sh runs end to end against a local host"

for i in $(seq 1 15); do
  running=$(docker compose -f stack/observability/docker-compose.yml ps --status running --quiet | wc -l | tr -d ' ')
  [[ "$running" == "3" ]] && break
  sleep 1
done
[[ "$running" == "3" ]]
assert_success "$?" "all three containers (otel-collector, tempo, loki) are running"

assert_contains "$(cat "$PROV_DIR"/stack-observability.yml)" "type: tempo" "datasource file was copied to the provisioning dir"

docker compose -f stack/observability/docker-compose.yml down -v >/dev/null 2>&1

( bash "$SCRIPT" --host "not a host" ) 2>/dev/null
assert_failure "$?" "rejects a malformed --host"
