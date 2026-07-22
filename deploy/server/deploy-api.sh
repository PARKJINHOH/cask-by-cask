#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask 백엔드 배포 (서버에서 실행) — jar 교체 + 재시작 + 헬스체크 + 롤백
#
# 흐름:
#   1. /app/spring-boot/app.jar.new 존재 확인 (Actions가 전송)
#   2. 기존 백업(app.jar_*) 삭제 → 최근 1개만 유지
#   3. 현재 운영본을 app.jar_<타임스탬프> 로 백업
#   4. 신규 jar 를 app.jar 로 교체 → 서비스 재시작
#   5. 재시작 또는 management readiness 실패 시 백업 복원 + 구버전 readiness 검증
#
# 사전 조건: caskbycask-api.service 설치, /app/env/api.env 존재,
#            배포 유저가 `systemctl restart caskbycask-api` 무암호 sudo 가능
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR=${API_DEPLOY_DIR:-/app/spring-boot}
SERVICE=caskbycask-api
HEALTH_URL=http://127.0.0.1:8081/actuator/health/readiness   # management 포트(application-prod.yml)
HEALTH_ATTEMPTS=${API_HEALTH_ATTEMPTS:-60}
HEALTH_INTERVAL_SECONDS=${API_HEALTH_INTERVAL_SECONDS:-2}
HEALTH_TOTAL_TIMEOUT_SECONDS=${API_HEALTH_TOTAL_TIMEOUT_SECONDS:-120}
HEALTH_CONNECT_TIMEOUT_SECONDS=1
HEALTH_REQUEST_TIMEOUT_SECONDS=2
NEW="$APP_DIR/app.jar.new"
CUR="$APP_DIR/app.jar"
LOCK_FILE=${API_DEPLOY_LOCK_FILE:-$APP_DIR/.deploy.lock}
TS=$(date +%Y%m%d-%H%M%S)
BACKUP=""
SWAP_STARTED=false
DEPLOY_VALIDATED=false
ROLLBACK_RUNNING=false

log() { printf "\033[1;36m[api]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[api]\033[0m %s\n" "$*" >&2; }

[[ "$HEALTH_ATTEMPTS" =~ ^[1-9][0-9]*$ ]] || {
    err "API_HEALTH_ATTEMPTS는 1 이상의 정수여야 합니다: $HEALTH_ATTEMPTS"
    exit 2
}
[[ "$HEALTH_INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || {
    err "API_HEALTH_INTERVAL_SECONDS는 0 이상의 정수여야 합니다: $HEALTH_INTERVAL_SECONDS"
    exit 2
}
[[ "$HEALTH_TOTAL_TIMEOUT_SECONDS" =~ ^[1-9][0-9]*$ ]] || {
    err "API_HEALTH_TOTAL_TIMEOUT_SECONDS는 1 이상의 정수여야 합니다: $HEALTH_TOTAL_TIMEOUT_SECONDS"
    exit 2
}

wait_for_readiness() {
    local phase="$1"
    local deadline=$((SECONDS + HEALTH_TOTAL_TIMEOUT_SECONDS))
    local health
    local i
    local remaining
    local request_timeout
    local sleep_duration
    for i in $(seq 1 "$HEALTH_ATTEMPTS"); do
        remaining=$((deadline - SECONDS))
        [ "$remaining" -gt 0 ] || break
        sleep_duration=$HEALTH_INTERVAL_SECONDS
        if [ "$remaining" -lt "$sleep_duration" ]; then
            sleep_duration=$remaining
        fi
        sleep "$sleep_duration"
        remaining=$((deadline - SECONDS))
        [ "$remaining" -gt 0 ] || break
        request_timeout=$HEALTH_REQUEST_TIMEOUT_SECONDS
        if [ "$remaining" -lt "$request_timeout" ]; then
            request_timeout=$remaining
        fi
        if health=$(curl --connect-timeout "$HEALTH_CONNECT_TIMEOUT_SECONDS" \
            --max-time "$request_timeout" -fsS "$HEALTH_URL" 2>/dev/null) \
            && grep -q '"status":"UP"' <<<"$health"; then
            log "$phase readiness UP (${i}회차)"
            return 0
        fi
    done
    return 1
}

rollback_previous() {
    local failed="$APP_DIR/app.jar.failed_$TS"
    ROLLBACK_RUNNING=true

    if [ -z "$BACKUP" ] || [ ! -f "$BACKUP" ]; then
        err "백업이 없어 자동 롤백할 수 없습니다. 수동 복구가 필요합니다."
        return 1
    fi

    if [ -f "$CUR" ] && ! mv -f "$CUR" "$failed"; then
        err "실패한 신규 jar 보존에 실패했습니다: $failed"
        return 1
    fi
    if ! mv "$BACKUP" "$CUR"; then
        err "이전 jar 복원에 실패했습니다: $BACKUP"
        return 1
    fi
    if ! sudo systemctl restart "$SERVICE"; then
        err "긴급: 이전 버전 복원 후 서비스 재시작에 실패했습니다. 수동 복구가 필요합니다."
        return 1
    fi
    if ! wait_for_readiness "롤백"; then
        err "긴급: 이전 버전은 복원했지만 readiness가 UP이 아닙니다. 수동 복구가 필요합니다."
        return 1
    fi

    err "이전 버전으로 롤백 및 readiness 확인 완료. 실패본: $(basename "$failed")"
    return 0
}

fail_deploy() {
    local reason="$1"
    err "$reason — 이전 버전 롤백 시도"
    if ! rollback_previous; then
        err "자동 롤백 검증 실패. 즉시 서비스 상태를 확인하세요."
    fi
    sudo journalctl -u "$SERVICE" -n 50 --no-pager || true
    exit 1
}

on_exit() {
    local status=$?
    trap - EXIT HUP INT TERM
    if [ "$status" -ne 0 ] && [ "$SWAP_STARTED" = true ] \
        && [ "$DEPLOY_VALIDATED" != true ] && [ "$ROLLBACK_RUNNING" != true ]; then
        set +e
        err "배포 교체 구간에서 예기치 않게 종료됨 — 이전 버전 롤백 시도"
        if ! rollback_previous; then
            err "자동 롤백 검증 실패. 즉시 서비스 상태를 확인하세요."
        fi
        sudo journalctl -u "$SERVICE" -n 50 --no-pager || true
    fi
    exit "$status"
}

on_signal() {
    local signal="$1"
    local status="$2"
    err "$signal 신호로 배포가 중단되었습니다."
    exit "$status"
}

command -v flock >/dev/null 2>&1 || { err "flock 명령이 없어 안전하게 배포할 수 없습니다."; exit 1; }
if ! { exec 9>"$LOCK_FILE"; }; then
    err "배포 잠금 파일을 열 수 없습니다: $LOCK_FILE"
    exit 1
fi
if ! flock -n 9; then
    err "다른 API 배포가 진행 중입니다: $LOCK_FILE"
    exit 1
fi

trap on_exit EXIT
trap 'on_signal HUP 129' HUP
trap 'on_signal INT 130' INT
trap 'on_signal TERM 143' TERM

[ -f "$NEW" ] || { err "신규 jar 없음: $NEW"; exit 1; }

# 2) 이전 백업 삭제 (배포 후 current + 직전 백업 1개만 유지)
rm -f "$APP_DIR"/app.jar_* "$APP_DIR"/app.jar.failed_* 2>/dev/null || true

# 3) 현재 운영본 백업
if [ -f "$CUR" ]; then
    BACKUP="$APP_DIR/app.jar_$TS"
    SWAP_STARTED=true
    if ! mv "$CUR" "$BACKUP"; then
        SWAP_STARTED=false
        err "현재 jar 백업에 실패했습니다. 교체를 시작하지 않습니다."
        exit 1
    fi
    log "백업: $(basename "$BACKUP")"
fi

# 4) 교체 + 재시작
SWAP_STARTED=true
if ! mv "$NEW" "$CUR"; then
    fail_deploy "신규 jar 교체 실패"
fi
log "교체 완료 → 재시작 ($SERVICE)"
if ! sudo systemctl restart "$SERVICE"; then
    fail_deploy "신규 버전 서비스 재시작 실패"
fi

# 5) 헬스체크 (단계별 총 최대 120초)
log "헬스체크 대기: $HEALTH_URL"
if wait_for_readiness "신규 버전"; then
    DEPLOY_VALIDATED=true
    log "API readiness 검증 완료 ($TS)"
    # nginx 기동 보장 — stop-web.sh 후 배포 시 자동 복구
    if ! systemctl is-active --quiet nginx; then
        log "nginx 내려가 있음 → 자동 기동"
        if ! sudo systemctl start nginx; then
            err "API는 정상이나 nginx 자동 기동에 실패했습니다. 즉시 nginx 상태를 확인하세요."
            exit 1
        fi
        log "✅ nginx 기동 완료"
    fi
    log "✅ 배포 성공 ($TS)"
    exit 0
fi

fail_deploy "신규 버전 readiness 확인 실패"
