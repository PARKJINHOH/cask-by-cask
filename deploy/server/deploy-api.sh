#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask 백엔드 배포 (서버에서 실행) — jar 교체 + 재시작 + 헬스체크 + 롤백
#
# 흐름:
#   1. /app/spring-boot/app.jar.new 존재 확인 (Actions가 전송)
#   2. 기존 백업(app.jar_*) 삭제 → 최근 1개만 유지
#   3. 현재 운영본을 app.jar_<타임스탬프> 로 백업
#   4. 신규 jar 를 app.jar 로 교체 → 서비스 재시작
#   5. management readiness 헬스체크 → 실패 시 백업으로 롤백
#
# 사전 조건: caskbycask-api.service 설치, /app/env/api.env 존재,
#            배포 유저가 `systemctl restart caskbycask-api` 무암호 sudo 가능
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR=/app/spring-boot
SERVICE=caskbycask-api
HEALTH_URL=http://127.0.0.1:8081/actuator/health/readiness   # management 포트(application-prod.yml)
NEW="$APP_DIR/app.jar.new"
CUR="$APP_DIR/app.jar"
TS=$(date +%Y%m%d-%H%M%S)

log() { printf "\033[1;36m[api]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[api]\033[0m %s\n" "$*" >&2; }

[ -f "$NEW" ] || { err "신규 jar 없음: $NEW"; exit 1; }

# 2) 이전 백업 삭제 (current + previous 2개만 유지)
rm -f "$APP_DIR"/app.jar_* "$APP_DIR"/app.jar.failed_* 2>/dev/null || true

# 3) 현재 운영본 백업
BACKUP=""
if [ -f "$CUR" ]; then
    BACKUP="$APP_DIR/app.jar_$TS"
    mv "$CUR" "$BACKUP"
    log "백업: $(basename "$BACKUP")"
fi

# 4) 교체 + 재시작
mv "$NEW" "$CUR"
log "교체 완료 → 재시작 ($SERVICE)"
sudo systemctl restart "$SERVICE"

# 5) 헬스체크 (최대 120초)
log "헬스체크 대기: $HEALTH_URL"
for i in $(seq 1 60); do
    sleep 2
    if curl -fsS "$HEALTH_URL" 2>/dev/null | grep -q '"status":"UP"'; then
        log "✅ 배포 성공 ($TS), readiness UP (${i}회차)"
        # nginx 기동 보장 — stop-web.sh 후 배포 시 자동 복구
        if ! systemctl is-active --quiet nginx; then
            log "nginx 내려가 있음 → 자동 기동"
            sudo systemctl start nginx
            log "✅ nginx 기동 완료"
        fi
        exit 0
    fi
done

# 실패 → 롤백
err "헬스체크 실패 — 롤백 시도"
if [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then
    mv -f "$CUR" "$APP_DIR/app.jar.failed_$TS" || true
    mv "$BACKUP" "$CUR"
    sudo systemctl restart "$SERVICE"
    err "이전 버전으로 롤백 완료. 실패본: app.jar.failed_$TS"
else
    err "백업 없음 — 롤백 불가. 최근 로그:"
fi
sudo journalctl -u "$SERVICE" -n 50 --no-pager || true
exit 1
