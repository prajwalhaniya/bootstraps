#!/usr/bin/env bash
# Idempotent Pigsty (single-node Postgres + bundled Prometheus/Grafana) install wrapper.
#
# Usage: install-pigsty.sh --host <local|user@host> [--dry-run] [--force]

source "$(dirname "${BASH_SOURCE[0]}")/../lib/common.sh"

# Verify this against Pigsty's own docs at implementation/upgrade time — this is the
# one place that needs to change if Pigsty's installer or CLI incantation changes.
pigsty::install_cmd() {
    cat <<'CMD'
curl -fsSL https://repo.pigsty.cc/get | bash
cd ~/pigsty
./configure
./install.yml
CMD
}

main() {
    local host=""
    local dry_run=0
    local force=0

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --host)
                host="$2"
                shift 2
                ;;
            --dry-run)
                dry_run=1
                shift
                ;;
            --force)
                force=1
                shift
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

    if [[ "$dry_run" -eq 1 ]]; then
        pigsty::install_cmd
        exit 0
    fi

    prereq::require_cmd "ssh" || exit 1
    prereq::require_cmd "bash" || exit 1

    local presence
    presence=$(target::run "$host" '[ -d ~/pigsty ] && echo PRESENT || echo ABSENT')

    if [[ "$presence" == "PRESENT" && "$force" -ne 1 ]]; then
        log::info "Pigsty already installed on $host, skipping (use --force to reinstall)"
        exit 0
    fi

    target::run "$host" "$(pigsty::install_cmd)"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
