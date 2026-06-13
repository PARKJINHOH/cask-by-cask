#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask 백엔드 종료 (서버에서 실행) — Spring Boot 서비스만 중지
#
# 흐름:
#   1. 현재 서비스 상태 확인
#   2. systemctl stop caskbycask-api
#   3. 중지 확인
#
# 사전 조건: 배포 유저가 `systemctl stop caskbycask-api` 무암호 sudo 가능
# 참고: 다시 기동하려면 `sudo systemctl start caskbycask-api`
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SERVICE=caskbycask-api

log() { printf "\033[1;36m[api]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[api]\033[0m %s\n" "$*" >&2; }

if ! systemctl is-active --quiet "$SERVICE"; then
    log "이미 중지됨 ($SERVICE) — 작업 없음"
    exit 0
fi

log "서비스 중지: $SERVICE"
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
