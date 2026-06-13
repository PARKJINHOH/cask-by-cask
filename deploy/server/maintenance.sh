#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask 서버 점검 모드 토글 (서버에서 실행)
#
# nginx(caskbycask.conf)는 요청마다 점검 플래그 파일 존재 여부를 검사한다:
#   - 플래그 ON  → SPA 방문자: 점검 페이지(503) / API: JSON 503(SERVER_MAINTENANCE)
#   - 플래그 OFF → 정상 서비스
# 플래그는 요청마다 평가되므로 nginx reload / sudo 가 필요 없다(파일만 생성·삭제).
# /healthz 헬스체크는 점검 중에도 200 을 유지한다(모니터링 오탐 방지).
#
# 사용법:
#   ./maintenance.sh on       # 점검 시작 (점검 페이지 노출)
#   ./maintenance.sh off      # 점검 종료 (정상 복귀)
#   ./maintenance.sh status   # 현재 상태 확인
#
# 사전 조건: 점검 페이지가 /app/vite/maintenance.html 에 설치되어 있어야 한다.
#            (setup-server.md 8-1 참고 — 배포(dist 교체)에 영향받지 않도록 dist 와 분리 보관)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

WEB_DIR=/app/vite
FLAG="$WEB_DIR/maintenance.on"
PAGE="$WEB_DIR/maintenance.html"

log()  { printf "\033[1;33m[maint]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[maint]\033[0m %s\n" "$*" >&2; }
ok()   { printf "\033[1;32m[maint]\033[0m %s\n" "$*"; }

usage() { err "사용법: $0 {on|off|status}"; exit 2; }

[ $# -eq 1 ] || usage

case "$1" in
  on)
    if [ ! -f "$PAGE" ]; then
        err "점검 페이지 없음: $PAGE — 먼저 maintenance.html 을 배치하세요(setup-server.md 8-1)."
        exit 1
    fi
    touch "$FLAG"
    ok "✅ 점검 모드 ON — 방문자에게 점검 페이지가 노출됩니다."
    log "관리자 우회: /__cbc_unlock_<시크릿> URL 1회 방문 → 쿠키 발급(설정은 setup-server.md 8-2)"
    log "종료하려면: $0 off"
    ;;
  off)
    if [ -f "$FLAG" ]; then
        rm -f "$FLAG"
        ok "✅ 점검 모드 OFF — 정상 서비스로 복귀했습니다."
    else
        log "이미 정상 서비스 상태입니다 (플래그 없음)."
    fi
    ;;
  status)
    if [ -f "$FLAG" ]; then
        log "현재 상태: 🛠  점검 모드 ON  (플래그: $FLAG)"
    else
        log "현재 상태: ✅ 정상 서비스"
    fi
    [ -f "$PAGE" ] && log "점검 페이지: 설치됨 ($PAGE)" || err "점검 페이지: 없음 ($PAGE)"
    ;;
  *)
    usage
    ;;
esac
