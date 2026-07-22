#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
TMP_DIR=$(mktemp -d)
MOCK_BIN="$TMP_DIR/bin"

cleanup() { rm -rf -- "$TMP_DIR"; }
trap cleanup EXIT

fail() {
    echo "release deploy test failed: $*" >&2
    exit 1
}

mkdir -p "$MOCK_BIN"

cat > "$MOCK_BIN/sudo" <<'MOCK'
#!/usr/bin/env bash
exec "$@"
MOCK

cat > "$MOCK_BIN/systemctl" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'systemctl %s\n' "$*" >> "$MOCK_STATE_DIR/calls"
case "${1:-}" in
  restart)
    count=0
    [ ! -f "$MOCK_STATE_DIR/restart.count" ] || count=$(cat "$MOCK_STATE_DIR/restart.count")
    count=$((count + 1))
    printf '%s' "$count" > "$MOCK_STATE_DIR/restart.count"
    if [ "${MOCK_SIGNAL_ON_RESTART_COUNT:-0}" -eq "$count" ]; then
      kill -TERM "$PPID"
      exit 143
    fi
    result=$(printf '%s\n' "${MOCK_RESTART_RESULTS:-0}" | cut -d, -f"$count")
    [ -n "$result" ] || result=1
    exit "$result"
    ;;
  is-active)
    exit "${MOCK_NGINX_ACTIVE_RESULT:-0}"
    ;;
  start)
    exit "${MOCK_NGINX_START_RESULT:-0}"
    ;;
  *)
    echo "unexpected systemctl invocation: $*" >&2
    exit 2
    ;;
esac
MOCK

cat > "$MOCK_BIN/curl" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'curl %s\n' "$*" >> "$MOCK_STATE_DIR/calls"
for arg in "$@"; do
  if [ "$arg" = "-I" ]; then
    exit 0
  fi
done
count=0
[ ! -f "$MOCK_STATE_DIR/curl.count" ] || count=$(cat "$MOCK_STATE_DIR/curl.count")
count=$((count + 1))
printf '%s' "$count" > "$MOCK_STATE_DIR/curl.count"
result=$(printf '%s\n' "${MOCK_CURL_RESULTS:-down}" | cut -d, -f"$count")
[ -n "$result" ] || result=down
case "$result" in
  up)
    printf '%s\n' '{"status":"UP"}'
    exit 0
    ;;
  down)
    exit 22
    ;;
  status-down)
    printf '%s\n' '{"status":"DOWN"}'
    exit 0
    ;;
  *)
    echo "unexpected curl result: $result" >&2
    exit 2
    ;;
esac
MOCK

cat > "$MOCK_BIN/sleep" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK

cat > "$MOCK_BIN/journalctl" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK

cat > "$MOCK_BIN/ss" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK

cat > "$MOCK_BIN/flock" <<'MOCK'
#!/usr/bin/env bash
exit "${MOCK_FLOCK_RESULT:-0}"
MOCK

chmod +x "$MOCK_BIN"/*

CASE_STATUS=0
CASE_DIR=""
CASE_OUTPUT=""

run_api() {
    local name="$1"
    local restart_results="$2"
    local curl_results="$3"
    local with_old="${4:-true}"
    local nginx_active="${5:-0}"
    local nginx_start="${6:-0}"
    local flock_result="${7:-0}"
    local signal_on_restart="${8:-0}"

    CASE_DIR="$TMP_DIR/$name"
    CASE_OUTPUT="$CASE_DIR/output.log"
    mkdir -p "$CASE_DIR/app" "$CASE_DIR/state"
    printf 'new-api' > "$CASE_DIR/app/app.jar.new"
    if [ "$with_old" = true ]; then
        printf 'old-api' > "$CASE_DIR/app/app.jar"
    fi

    set +e
    PATH="$MOCK_BIN:$PATH" \
    MOCK_STATE_DIR="$CASE_DIR/state" \
    MOCK_RESTART_RESULTS="$restart_results" \
    MOCK_CURL_RESULTS="$curl_results" \
    MOCK_NGINX_ACTIVE_RESULT="$nginx_active" \
    MOCK_NGINX_START_RESULT="$nginx_start" \
    MOCK_FLOCK_RESULT="$flock_result" \
    MOCK_SIGNAL_ON_RESTART_COUNT="$signal_on_restart" \
    API_DEPLOY_DIR="$CASE_DIR/app" \
    API_DEPLOY_LOCK_FILE="$CASE_DIR/state/deploy.lock" \
    API_HEALTH_ATTEMPTS=1 \
    API_HEALTH_INTERVAL_SECONDS=0 \
    bash "$ROOT_DIR/deploy/server/deploy-api.sh" >"$CASE_OUTPUT" 2>&1
    CASE_STATUS=$?
    set -e
}

run_web() {
    local name="$1"
    local restart_results="$2"
    local curl_results="$3"
    local with_old="${4:-true}"
    local flock_result="${5:-0}"
    local signal_on_restart="${6:-0}"

    CASE_DIR="$TMP_DIR/$name"
    CASE_OUTPUT="$CASE_DIR/output.log"
    mkdir -p "$CASE_DIR/web/dist.new" "$CASE_DIR/state"
    printf 'new-web' > "$CASE_DIR/web/dist.new/version"
    if [ "$with_old" = true ]; then
        mkdir -p "$CASE_DIR/web/dist"
        printf 'old-web' > "$CASE_DIR/web/dist/version"
    fi

    set +e
    PATH="$MOCK_BIN:$PATH" \
    MOCK_STATE_DIR="$CASE_DIR/state" \
    MOCK_RESTART_RESULTS="$restart_results" \
    MOCK_CURL_RESULTS="$curl_results" \
    MOCK_FLOCK_RESULT="$flock_result" \
    MOCK_SIGNAL_ON_RESTART_COUNT="$signal_on_restart" \
    WEB_DEPLOY_DIR="$CASE_DIR/web" \
    WEB_DEPLOY_LOCK_FILE="$CASE_DIR/state/deploy.lock" \
    WEB_HEALTH_ATTEMPTS=1 \
    WEB_HEALTH_INTERVAL_SECONDS=0 \
    bash "$ROOT_DIR/deploy/server/deploy-web.sh" >"$CASE_OUTPUT" 2>&1
    CASE_STATUS=$?
    set -e
}

assert_success() {
    [ "$CASE_STATUS" -eq 0 ] || fail "expected success: $CASE_OUTPUT"
}

assert_failure() {
    [ "$CASE_STATUS" -ne 0 ] || fail "expected failure: $CASE_OUTPUT"
}

assert_text() {
    grep -Fq "$1" "$CASE_OUTPUT" || fail "missing log '$1': $CASE_OUTPUT"
}

assert_no_text() {
    if grep -Fq "$1" "$CASE_OUTPUT"; then
        fail "unexpected log '$1': $CASE_OUTPUT"
    fi
}

assert_restart_count() {
    local expected="$1"
    local actual=0
    [ ! -f "$CASE_DIR/state/restart.count" ] || actual=$(cat "$CASE_DIR/state/restart.count")
    [ "$actual" -eq "$expected" ] || fail "restart count $actual != $expected: $CASE_OUTPUT"
}

assert_api_current() {
    [ -f "$CASE_DIR/app/app.jar" ] || fail "API current jar missing"
    [ "$(cat "$CASE_DIR/app/app.jar")" = "$1" ] || fail "unexpected API current jar"
}

assert_web_current() {
    [ -f "$CASE_DIR/web/dist/version" ] || fail "Web current dist missing"
    [ "$(cat "$CASE_DIR/web/dist/version")" = "$1" ] || fail "unexpected Web current dist"
}

assert_api_failed_artifact() {
    local failed
    failed=$(find "$CASE_DIR/app" -maxdepth 1 -type f -name 'app.jar.failed_*' -print -quit)
    [ -n "$failed" ] || fail "API failed artifact missing"
    [ "$(cat "$failed")" = 'new-api' ] || fail "unexpected API failed artifact"
}

assert_web_failed_artifact() {
    local failed
    failed=$(find "$CASE_DIR/web" -maxdepth 1 -type d -name 'dist_failed_*' -print -quit)
    [ -n "$failed" ] || fail "Web failed artifact missing"
    [ "$(cat "$failed/version")" = 'new-web' ] || fail "unexpected Web failed artifact"
}

# API: normal deployment remains unchanged.
run_api api-success 0 up
assert_success
assert_api_current new-api
assert_restart_count 1
assert_no_text '롤백 및 readiness 확인 완료'
grep -Fq -- '--connect-timeout 1 --max-time 2' "$CASE_DIR/state/calls" \
    || fail "API health curl timeout options missing"

# API: restart and health failures both restore and verify the previous release.
run_api api-new-restart-fails '1,0' up
assert_failure
assert_api_current old-api
assert_api_failed_artifact
assert_restart_count 2
assert_text '롤백 및 readiness 확인 완료'

run_api api-term-during-swap '0,0' up true 0 0 0 1
assert_failure
assert_api_current old-api
assert_api_failed_artifact
assert_restart_count 2
assert_text 'TERM 신호로 배포가 중단되었습니다'
assert_text '롤백 및 readiness 확인 완료'

run_api api-new-health-fails '0,0' 'status-down,up'
assert_failure
assert_api_current old-api
assert_api_failed_artifact
assert_restart_count 2
assert_text '롤백 및 readiness 확인 완료'

# API: rollback is never reported as complete when restart/readiness fails.
run_api api-rollback-restart-fails '0,1' down
assert_failure
assert_api_current old-api
assert_restart_count 2
assert_text '서비스 재시작에 실패했습니다'
assert_no_text '롤백 및 readiness 확인 완료'

run_api api-rollback-health-fails '0,0' 'down,down'
assert_failure
assert_api_current old-api
assert_restart_count 2
assert_text 'readiness가 UP이 아닙니다'
assert_no_text '롤백 및 readiness 확인 완료'

# API: first deployment keeps the failed release, and post-validation nginx failure does not roll back.
run_api api-without-backup 1 down false
assert_failure
assert_api_current new-api
assert_restart_count 1
assert_text '백업이 없어 자동 롤백할 수 없습니다'

run_api api-nginx-start-fails 0 up true 1 1
assert_failure
assert_api_current new-api
assert_restart_count 1
assert_text 'nginx 자동 기동에 실패했습니다'
assert_no_text '이전 버전 롤백 시도'
assert_no_text '✅ 배포 성공'

# API: a concurrent deployment is rejected before any artifact is moved.
run_api api-deploy-lock-busy 0 up true 0 0 1
assert_failure
assert_api_current old-api
assert_restart_count 0
assert_text '다른 API 배포가 진행 중입니다'

# Web: normal deployment remains unchanged.
run_web web-success 0 up
assert_success
assert_web_current new-web
assert_restart_count 1
assert_no_text '롤백 및 health 확인 완료'
grep -Fq -- '--connect-timeout 1 --max-time 2' "$CASE_DIR/state/calls" \
    || fail "Web health curl timeout options missing"

# Web: restart and health failures both restore and verify the previous release.
run_web web-new-restart-fails '1,0' up
assert_failure
assert_web_current old-web
assert_web_failed_artifact
assert_restart_count 2
assert_text '롤백 및 health 확인 완료'
grep -Fq -- '--connect-timeout 1 --max-time 3 -I' "$CASE_DIR/state/calls" \
    || fail "Web diagnostic curl timeout options missing"

run_web web-term-during-swap '0,0' up true 0 1
assert_failure
assert_web_current old-web
assert_web_failed_artifact
assert_restart_count 2
assert_text 'TERM 신호로 배포가 중단되었습니다'
assert_text '롤백 및 health 확인 완료'

run_web web-new-health-fails '0,0' 'down,up'
assert_failure
assert_web_current old-web
assert_web_failed_artifact
assert_restart_count 2
assert_text '롤백 및 health 확인 완료'

# Web: rollback is never reported as complete when restart/health fails.
run_web web-rollback-restart-fails '0,1' down
assert_failure
assert_web_current old-web
assert_restart_count 2
assert_text '서비스 재시작에 실패했습니다'
assert_no_text '롤백 및 health 확인 완료'

run_web web-rollback-health-fails '0,0' 'down,down'
assert_failure
assert_web_current old-web
assert_restart_count 2
assert_text 'health가 UP이 아닙니다'
assert_no_text '롤백 및 health 확인 완료'

# Web: a first-deploy failure keeps the new dist available for diagnosis.
run_web web-without-backup 1 down false
assert_failure
assert_web_current new-web
assert_restart_count 1
assert_text '신규 dist는 보존합니다'

# Web: a concurrent deployment is rejected before any artifact is moved.
run_web web-deploy-lock-busy 0 up true 1
assert_failure
assert_web_current old-web
assert_restart_count 0
assert_text '다른 Web 배포가 진행 중입니다'

echo "API/Web release rollback tests passed"
