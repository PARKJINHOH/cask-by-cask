#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask 프론트 종료 (서버에서 실행) — nginx 중지
#
# 웹(vite dist)은 별도 프로세스가 없고 nginx 가 /app/vite/dist 를 정적 서빙한다.
# 따라서 "웹 종료" = nginx 중지.
#
# ⚠️ 주의: nginx 는 프론트뿐 아니라 /api 리버스 프록시도 담당한다.
#          nginx 를 내리면 백엔드 API 도 외부에서 접근 불가가 된다.
#
# 사전 조건: 배포 유저가 `systemctl stop nginx` 무암호 sudo 가능해야 함
#            (없으면 setup-server.md 의 sudoers 에 추가 필요)
# 참고: 다시 기동하려면 `sudo systemctl start nginx`
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SERVICE=nginx

log() { printf "\033[1;35m[web]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[web]\033[0m %s\n" "$*" >&2; }

if ! systemctl is-active --quiet "$SERVICE"; then
    log "이미 중지됨 ($SERVICE) — 작업 없음"
    exit 0
fi

log "서비스 중지: $SERVICE (프론트 + /api 프록시 모두 내려감)"
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
