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
#   ./maintenance.sh on       # 점검 시작 (점검 페이지 노출 + 우회 URL 자동 생성)
#   ./maintenance.sh off      # 점검 종료 (정상 복귀)
#   ./maintenance.sh status   # 현재 상태 확인
#
# 사전 조건: 점검 페이지가 /app/next/maintenance.html 에 설치되어 있어야 한다.
#            (setup-server.md 8-1 참고 — 배포(dist 교체)에 영향받지 않도록 dist 와 분리 보관)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

WEB_DIR=/app/next
FLAG="$WEB_DIR/maintenance.on"
PAGE="$WEB_DIR/maintenance.html"
SECRET_FILE="$WEB_DIR/.maintenance_secret"
NGINX_CONF="/etc/nginx/sites-available/caskbycask.conf"

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

    # 우회 시크릿 생성 및 nginx 설정 자동 적용
    # SECRET_FILE 이 conf 와 어긋난 경우에도 현재 conf 의 점검 우회 토큰 3곳을 직접 교체한다.
    NEW_SECRET=$(openssl rand -hex 24)
    sudo env NEW_SECRET="$NEW_SECRET" perl -0pi -e '
        s/(?<=\$cookie_cbc_maint = ")[^"]+(?=")/$ENV{NEW_SECRET}/g;
        s/(?<=location = \/__cbc_unlock_)[^\s{]+/$ENV{NEW_SECRET}/g;
        s/(?<=cbc_maint=)[^;"]+/$ENV{NEW_SECRET}/g;
    ' "$NGINX_CONF"

    if ! sudo grep -qF "\$cookie_cbc_maint = \"$NEW_SECRET\"" "$NGINX_CONF" ||
       ! sudo grep -qF "__cbc_unlock_$NEW_SECRET" "$NGINX_CONF" ||
       ! sudo grep -qF "cbc_maint=$NEW_SECRET;" "$NGINX_CONF"; then
        err "nginx 설정에 우회 시크릿을 적용하지 못했습니다 — $NGINX_CONF 를 확인하세요."
        exit 1
    fi

    echo "$NEW_SECRET" > "$SECRET_FILE"
    chmod 600 "$SECRET_FILE"

    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx
        echo ""
        ok "🔑 점검 우회 URL: https://www.caskbycask.net/__cbc_unlock_$NEW_SECRET"
        log "   이 URL 을 안전하게 보관하세요. 쿠키 만료(24h) 시 재방문하면 됩니다."
        echo ""
    else
        err "nginx 설정 검증 실패 — sudo nginx -t 로 직접 확인하세요."
        exit 1
    fi

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
        if [ -f "$SECRET_FILE" ]; then
            log "우회 URL: https://www.caskbycask.net/__cbc_unlock_$(cat "$SECRET_FILE")"
        else
            log "우회 URL: 미설정 (maintenance.sh on 으로 재시작하면 자동 생성됩니다)"
        fi
    else
        log "현재 상태: ✅ 정상 서비스"
    fi
    [ -f "$PAGE" ] && log "점검 페이지: 설치됨 ($PAGE)" || err "점검 페이지: 없음 ($PAGE)"
    ;;
  *)
    usage
    ;;
esac
