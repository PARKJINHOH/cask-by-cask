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
#   6. 헬스체크 실패 시 자동 롤백
#
# Working Directory = /app/next/dist
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

WEB_DIR=/app/next
NEW="$WEB_DIR/dist.new"
CUR="$WEB_DIR/dist"
TS=$(date +%Y%m%d-%H%M%S)

log() { printf "\033[1;35m[web]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[web]\033[0m %s\n" "$*" >&2; }

[ -d "$NEW" ] || { err "신규 dist 없음: $NEW"; exit 1; }

# 2) 이전 백업 삭제 (current + previous 2개만 유지)
rm -rf "$WEB_DIR"/dist_* 2>/dev/null || true

# 3) 현재 운영본 백업
if [ -d "$CUR" ]; then
    mv "$CUR" "$WEB_DIR/dist_$TS"
    log "백업: dist_$TS"
fi

# 4) 교체
mv "$NEW" "$CUR"

# 5) Next.js systemd 서비스 재시작
log "Next.js 서비스 재시작 중..."
sudo systemctl restart caskbycask-web

# 6) 서비스 헬스 체크 (정상 구동 여부 검증)
log "Next.js 서비스 헬스체크 중..."
sleep 3
if curl -s --fail http://127.0.0.1:3000/healthz >/dev/null; then
    log "✅ 프론트 배포 완료 ($TS)"
else
    err "❌ Next.js 서비스 구동 실패! 롤백을 수행합니다..."
    # 롤백 처리
    rm -rf "$CUR"
    if [ -d "$WEB_DIR/dist_$TS" ]; then
        mv "$WEB_DIR/dist_$TS" "$CUR"
        sudo systemctl restart caskbycask-web
        log "🔄 이전 버전으로 롤백 완료"
    else
        err "🔄 복구할 백업 버전(dist_$TS)이 없습니다."
    fi
    exit 1
fi
