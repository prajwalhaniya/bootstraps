#!/usr/bin/env bash
# Idempotently creates a Postgres database + role for a project, on an already-running
# Pigsty-managed Postgres instance.
#
# Usage: create-db.sh <project_name> --admin-dsn <postgres_dsn> [--state-dir <dir>]
# Prints exactly one line on success: DATABASE_URL=postgres://<name>:<pw>@<host>:<port>/<name>

source "$(dirname "${BASH_SOURCE[0]}")/../lib/common.sh"

db::parse_host_port() {
    # Extracts "host:port" from a postgres://user:pass@host:port/dbname DSN.
    local dsn="$1"
    echo "$dsn" | sed -E 's#^[a-zA-Z]+://[^@]*@([^/]+)/.*$#\1#'
}

main() {
    local project_name="$1"
    shift
    local admin_dsn=""
    local state_dir="$(dirname "${BASH_SOURCE[0]}")/../.state"

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --admin-dsn)
                admin_dsn="$2"
                shift 2
                ;;
            --state-dir)
                state_dir="$2"
                shift 2
                ;;
            *)
                log::error "unknown argument: $1"
                exit 1
                ;;
        esac
    done

    if [[ -z "$project_name" ]]; then
        log::error "project name is required"
        exit 1
    fi

    if [[ ! "$project_name" =~ ^[a-z][a-z0-9_]{0,62}$ ]]; then
        log::error "'$project_name' is not a valid Postgres identifier (expected lowercase letters, digits, underscores, starting with a letter)"
        exit 1
    fi

    if [[ -z "$admin_dsn" ]]; then
        log::error "--admin-dsn is required"
        exit 1
    fi

    prereq::require_cmd "psql" || exit 1

    mkdir -p "$state_dir"
    local state_file="$state_dir/$project_name.env"
    local host_port
    host_port=$(db::parse_host_port "$admin_dsn")

    local role_exists
    role_exists=$(psql "$admin_dsn" -tAc "select 1 from pg_roles where rolname='$project_name'" 2>/dev/null)

    if [[ -f "$state_file" ]]; then
        if [[ "$role_exists" != "1" ]]; then
            log::error "state file present but role missing — resolve manually ($state_file)"
            exit 1
        fi
        source "$state_file"
        echo "DATABASE_URL=$DATABASE_URL"
        exit 0
    fi

    if [[ "$role_exists" == "1" ]]; then
        log::error "role '$project_name' already exists on the server but no state file was found for it — resolve manually"
        exit 1
    fi

    local password
    password=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-32)

    psql "$admin_dsn" -v ON_ERROR_STOP=1 -c "CREATE ROLE \"$project_name\" LOGIN PASSWORD '$password'" >/dev/null
    psql "$admin_dsn" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$project_name\" OWNER \"$project_name\"" >/dev/null

    local database_url="postgres://$project_name:$password@$host_port/$project_name"
    echo "DATABASE_URL=$database_url" > "$state_file"
    echo "DATABASE_URL=$database_url"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
