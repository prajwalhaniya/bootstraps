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
