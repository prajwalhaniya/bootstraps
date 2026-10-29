#!/usr/bin/env bash
# Zero-dependency assertion helpers for stack/tests/*.sh

HARNESS_PASS=0
HARNESS_FAIL=0

harness::_pass() {
    echo "ok - $1"
    HARNESS_PASS=$((HARNESS_PASS + 1))
}

harness::_fail() {
    local msg="$1"
    shift
    echo "not ok - $msg"
    for line in "$@"; do
        echo "    $line"
    done
    HARNESS_FAIL=$((HARNESS_FAIL + 1))
}

assert_eq() {
    local expected="$1"
    local actual="$2"
    local msg="$3"
    if [[ "$expected" == "$actual" ]]; then
        harness::_pass "$msg"
    else
        harness::_fail "$msg" "expected: $expected" "actual:   $actual"
    fi
}

assert_success() {
    local status="$1"
    local msg="$2"
    if [[ "$status" -eq 0 ]]; then
        harness::_pass "$msg"
    else
        harness::_fail "$msg" "expected exit 0, got $status"
    fi
}

assert_failure() {
    local status="$1"
    local msg="$2"
    if [[ "$status" -ne 0 ]]; then
        harness::_pass "$msg"
    else
        harness::_fail "$msg" "expected a nonzero exit, got 0"
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local msg="$3"
    if [[ "$haystack" == *"$needle"* ]]; then
        harness::_pass "$msg"
    else
        harness::_fail "$msg" "expected to find: $needle" "in: $haystack"
    fi
}

harness::summary() {
    local total=$((HARNESS_PASS + HARNESS_FAIL))
    echo "---"
    echo "$HARNESS_PASS/$total passed"
    [[ "$HARNESS_FAIL" -eq 0 ]]
}
