#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask 프론트 배포 (서버에서 실행) — dist 교체 (무중단에 가까움)
#
# 흐름:
#   1. /app/vite/dist.new 존재 확인 (Actions가 rsync로 전송)
#   2. 기존 백업(dist_*) 삭제 → 최근 1개만 유지
#   3. 현재 dist 를 dist_<타임스탬프> 로 백업
#   4. 신규 dist 를 dist 로 교체 (mv → mv, 수 ms 공백)
#
# nginx root = /app/vite/dist
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

WEB_DIR=/app/vite
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
log "✅ 프론트 배포 완료 ($TS)"
