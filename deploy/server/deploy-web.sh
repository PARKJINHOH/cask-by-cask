#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask Next.js 프론트 배포 (서버에서 실행) — standalone dist 교체 및 서비스 재시작
#
# 흐름:
#   1. /app/next/dist.new 존재 확인 (Actions가 rsync로 전송)
#   2. 기존 백업(dist_*) 삭제 → 최근 1개만 유지
#   3. 현재 dist 를 dist_<타임스탬프> 로 백업
#   4. 신규 dist 를 dist 로 교체 (mv → mv, 수 ms 공백)
#   5. systemctl restart caskbycask-web 실행
#   6. 재시작 또는 헬스체크 실패 시 백업 복원 + 구버전 health 검증
#
# Working Directory = /app/next/dist
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

WEB_DIR=${WEB_DEPLOY_DIR:-/app/next}
SERVICE=caskbycask-web
HEALTH_URL=http://127.0.0.1:3000/healthz
HEALTH_ATTEMPTS=${WEB_HEALTH_ATTEMPTS:-15}
HEALTH_INTERVAL_SECONDS=${WEB_HEALTH_INTERVAL_SECONDS:-1}
HEALTH_TOTAL_TIMEOUT_SECONDS=${WEB_HEALTH_TOTAL_TIMEOUT_SECONDS:-15}
HEALTH_CONNECT_TIMEOUT_SECONDS=1
HEALTH_REQUEST_TIMEOUT_SECONDS=2
NEW="$WEB_DIR/dist.new"
CUR="$WEB_DIR/dist"
LOCK_FILE=${WEB_DEPLOY_LOCK_FILE:-$WEB_DIR/.deploy.lock}
TS=$(date +%Y%m%d-%H%M%S)
BACKUP=""
SWAP_STARTED=false
DEPLOY_VALIDATED=false
ROLLBACK_RUNNING=false

log() { printf "\033[1;35m[web]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[web]\033[0m %s\n" "$*" >&2; }

[[ "$HEALTH_ATTEMPTS" =~ ^[1-9][0-9]*$ ]] || {
    err "WEB_HEALTH_ATTEMPTS는 1 이상의 정수여야 합니다: $HEALTH_ATTEMPTS"
    exit 2
}
[[ "$HEALTH_INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || {
    err "WEB_HEALTH_INTERVAL_SECONDS는 0 이상의 정수여야 합니다: $HEALTH_INTERVAL_SECONDS"
    exit 2
}
[[ "$HEALTH_TOTAL_TIMEOUT_SECONDS" =~ ^[1-9][0-9]*$ ]] || {
    err "WEB_HEALTH_TOTAL_TIMEOUT_SECONDS는 1 이상의 정수여야 합니다: $HEALTH_TOTAL_TIMEOUT_SECONDS"
    exit 2
}

wait_for_health() {
    local phase="$1"
    local deadline=$((SECONDS + HEALTH_TOTAL_TIMEOUT_SECONDS))
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
        if curl --connect-timeout "$HEALTH_CONNECT_TIMEOUT_SECONDS" \
            --max-time "$request_timeout" \
            --silent --fail "$HEALTH_URL" >/dev/null; then
            log "$phase health UP (${i}회차)"
            return 0
        fi
    done
    return 1
}

show_diagnostics() {
    err "── 서비스 로그 (journalctl) ──"
    sudo journalctl -u "$SERVICE" -n 50 --no-pager || true

    err "── 포트 3000/4000 상태 확인 ──"
    if command -v ss >/dev/null 2>&1; then
        ss -tln | grep -E '3000|4000' || true
    elif command -v netstat >/dev/null 2>&1; then
        netstat -an | grep -E '3000|4000' || true
    fi

    err "── 포트 3000 응답 테스트 ──"
    curl --connect-timeout 1 --max-time 3 -I http://127.0.0.1:3000/ || true
}

rollback_previous() {
    local failed="$WEB_DIR/dist_failed_$TS"
    ROLLBACK_RUNNING=true

    if [ -z "$BACKUP" ] || [ ! -d "$BACKUP" ]; then
        err "복구할 백업 버전이 없어 자동 롤백할 수 없습니다. 신규 dist는 보존합니다."
        return 1
    fi

    if [ -d "$CUR" ] && ! mv "$CUR" "$failed"; then
        err "실패한 신규 dist 보존에 실패했습니다: $failed"
        return 1
    fi
    if ! mv "$BACKUP" "$CUR"; then
        err "이전 dist 복원에 실패했습니다: $BACKUP"
        return 1
    fi
    if ! sudo systemctl restart "$SERVICE"; then
        err "긴급: 이전 버전 복원 후 서비스 재시작에 실패했습니다. 수동 복구가 필요합니다."
        return 1
    fi
    if ! wait_for_health "롤백"; then
        err "긴급: 이전 버전은 복원했지만 health가 UP이 아닙니다. 수동 복구가 필요합니다."
        return 1
    fi

    err "이전 버전으로 롤백 및 health 확인 완료. 실패본: $(basename "$failed")"
    return 0
}

fail_deploy() {
    local reason="$1"
    err "$reason — 이전 버전 롤백 시도"
    if ! rollback_previous; then
        err "자동 롤백 검증 실패. 즉시 서비스 상태를 확인하세요."
    fi
    show_diagnostics
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
        show_diagnostics
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
    err "다른 Web 배포가 진행 중입니다: $LOCK_FILE"
    exit 1
fi

trap on_exit EXIT
trap 'on_signal HUP 129' HUP
trap 'on_signal INT 130' INT
trap 'on_signal TERM 143' TERM

[ -d "$NEW" ] || { err "신규 dist 없음: $NEW"; exit 1; }

# 2) 이전 백업 삭제 (배포 후 current + 직전 백업 1개만 유지)
rm -rf "$WEB_DIR"/dist_* 2>/dev/null || true

# 3) 현재 운영본 백업
if [ -d "$CUR" ]; then
    BACKUP="$WEB_DIR/dist_$TS"
    SWAP_STARTED=true
    if ! mv "$CUR" "$BACKUP"; then
        SWAP_STARTED=false
        err "현재 dist 백업에 실패했습니다. 교체를 시작하지 않습니다."
        exit 1
    fi
    log "백업: dist_$TS"
fi

# 4) 교체
SWAP_STARTED=true
if ! mv "$NEW" "$CUR"; then
    fail_deploy "신규 dist 교체 실패"
fi

# 5) Next.js systemd 서비스 재시작
log "Next.js 서비스 재시작 중..."
if ! sudo systemctl restart "$SERVICE"; then
    fail_deploy "신규 버전 서비스 재시작 실패"
fi

# 6) 서비스 헬스 체크 (단계별 총 최대 15초)
log "Next.js 서비스 헬스체크 중..."
if wait_for_health "신규 버전"; then
    DEPLOY_VALIDATED=true
    log "✅ 프론트 배포 완료 ($TS)"
    exit 0
fi

fail_deploy "신규 버전 health 확인 실패"
