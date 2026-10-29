#!/usr/bin/env bash
# Idempotent installer for the observability add-on (OTel Collector + Tempo + Loki),
# plus best-effort wiring of their Grafana datasources into Pigsty's existing Grafana.
#
# Usage: install-stack.sh --host <local|user@host>
#          [--prometheus-remote-write-url <url>]
#          [--grafana-provisioning-dir <dir, default /etc/grafana/provisioning/datasources>]

source "$(dirname "${BASH_SOURCE[0]}")/../lib/common.sh"

STACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

main() {
    local host=""
    local prom_url=""
    local grafana_dir="/etc/grafana/provisioning/datasources"

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --host)
                host="$2"
                shift 2
                ;;
            --prometheus-remote-write-url)
                prom_url="$2"
                shift 2
                ;;
            --grafana-provisioning-dir)
                grafana_dir="$2"
                shift 2
                ;;
            *)
                log::error "unknown argument: $1"
                exit 1
                ;;
        esac
    done

    if [[ -z "$host" ]]; then
        log::error "--host is required (local, 127.0.0.1, or user@host)"
        exit 1
    fi

    target::validate "$host" || exit 1
    prereq::require_cmd "docker" || exit 1

    local datasource_file="$STACK_DIR/grafana-provisioning/datasources/stack-observability.yml"
    local compose_file="$STACK_DIR/docker-compose.yml"

    if target::is_local "$host"; then
        PROMETHEUS_REMOTE_WRITE_URL="$prom_url" docker compose -f "$compose_file" up -d
        mkdir -p "$grafana_dir"
        cp "$datasource_file" "$grafana_dir/stack-observability.yml"
    else
        local remote_dir="~/stack-observability"
        target::run "$host" "mkdir -p $remote_dir"
        target::copy "$host" "$compose_file" "$remote_dir/docker-compose.yml"
        target::copy "$host" "$STACK_DIR/otel-collector-config.yaml" "$remote_dir/otel-collector-config.yaml"
        target::copy "$host" "$STACK_DIR/tempo.yaml" "$remote_dir/tempo.yaml"
        target::run "$host" "cd $remote_dir && PROMETHEUS_REMOTE_WRITE_URL='$prom_url' docker compose up -d"

        target::run "$host" "mkdir -p '$grafana_dir'"
        target::copy "$host" "$datasource_file" "$grafana_dir/stack-observability.yml"

        if ! target::run "$host" "systemctl reload grafana-server"; then
            log::warn "could not reload grafana-server on $host automatically — reload or restart Grafana manually so it picks up the new Tempo/Loki datasources"
        fi
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
