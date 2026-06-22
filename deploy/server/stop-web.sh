#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask 프론트 종료 (서버에서 실행) — Next.js 서비스 중지
#
# 웹(Next.js)은 systemd 서비스 `caskbycask-web`로 구동됩니다.
# 따라서 "웹 종료" = caskbycask-web 서비스 중지.
#
# Nginx는 프록시 역할을 수행하므로 백엔드 API 및 점검 페이지를 위해 계속 실행됩니다.
#
# 사전 조건: 배포 유저가 `systemctl stop caskbycask-web` 무암호 sudo 가능해야 함
#            (없으면 setup-server.md 의 sudoers 에 추가 필요)
# 참고: 다시 기동하려면 `sudo systemctl start caskbycask-web`
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SERVICE=caskbycask-web

log() { printf "\033[1;35m[web]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[web]\033[0m %s\n" "$*" >&2; }

if ! systemctl is-active --quiet "$SERVICE"; then
    log "이미 중지됨 ($SERVICE) — 작업 없음"
    exit 0
fi

log "서비스 중지: $SERVICE (프론트엔드 서비스 중지)"
sudo systemctl stop "$SERVICE"

# 중지 확인 (최대 30초)
for i in $(seq 1 15); do
    if ! systemctl is-active --quiet "$SERVICE"; then
        log "✅ 중지 완료 ($SERVICE)"
        exit 0
    fi
    sleep 2
done

err "중지 확인 실패 — 상태 확인 필요"
systemctl status "$SERVICE" --no-pager || true
exit 1
