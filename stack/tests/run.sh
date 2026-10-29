#!/usr/bin/env bash
# Runs every stack/tests/test_*.sh file and reports a combined summary.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/harness.sh"

for test_file in "$DIR"/test_*.sh; do
    [[ -e "$test_file" ]] || continue
    echo "== $(basename "$test_file") =="
    source "$test_file"
done

harness::summary
exit $?
