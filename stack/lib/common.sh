#!/usr/bin/env bash
# Shared shell library for the stack bootstrap scripts.

log::info() { echo "[info] $*" >&2; }
log::warn() { echo "[warn] $*" >&2; }
log::error() { echo "[error] $*" >&2; }

target::is_local() {
    local host="$1"
    [[ "$host" == "local" || "$host" == "127.0.0.1" ]]
}

target::validate() {
    local host="$1"
    if target::is_local "$host"; then
        return 0
    fi
    if [[ "$host" =~ ^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$ ]]; then
        return 0
    fi
    log::error "invalid --host value: '$host' (expected 'local', '127.0.0.1', or 'user@host')"
    return 1
}

target::run() {
    local host="$1"
    local cmd="$2"
    if target::is_local "$host"; then
        bash -c "$cmd"
    else
        ssh "$host" "$cmd"
    fi
}

target::copy() {
    local host="$1"
    local local_path="$2"
    local remote_path="$3"
    if target::is_local "$host"; then
        cp "$local_path" "$remote_path"
    else
        scp "$local_path" "$host:$remote_path"
    fi
}

prereq::require_cmd() {
    local cmd_name="$1"
    if ! command -v "$cmd_name" >/dev/null 2>&1; then
        log::error "$cmd_name is required but was not found on PATH"
        return 1
    fi
    return 0
}
