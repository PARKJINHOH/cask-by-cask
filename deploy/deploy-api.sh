#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask 백엔드 배포 (Docker 미사용 / systemd)
#
# 사용법:  ./deploy/deploy-api.sh dev
#
# 동작:
#   1. Gradle bootJar 빌드 (테스트 제외)
#   2. jar 를 /opt/caskbycask-<env>/api/app.jar 로 교체
#   3. systemd 서비스 재시작
#   4. actuator readiness 헬스체크
#
# 사전 조건:
#   - JDK 21, systemd 유닛(caskbycask-<env>-api) 설치, /etc/caskbycask/<env>.env 존재
#   - 배포 유저가 systemctl 무암호 sudo 가능 (또는 root 실행)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV="${1:-}"
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo "Usage: $0 <dev|prod>" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SERVICE="caskbycask-${ENV}-api"
TARGET_DIR="/opt/caskbycask-${ENV}/api"
# 헬스체크용 management 포트 — EnvironmentFile 의 MANAGEMENT_SERVER_PORT 와 일치해야 함.
# (dev=8093, prod=8095. MGMT_PORT 환경변수로 강제 override 가능)
if [[ -z "${MGMT_PORT:-}" ]]; then
    case "$ENV" in
        dev)  MGMT_PORT=8093 ;;
        prod) MGMT_PORT=8095 ;;
    esac
fi

log() { printf "\033[1;36m[api:%s]\033[0m %s\n" "$ENV" "$*"; }
err() { printf "\033[1;31m[api:%s]\033[0m %s\n" "$ENV" "$*" >&2; }

# ── 1. 빌드 ──
log "Building bootJar..."
cd "$ROOT_DIR/caskbycask-api"
chmod +x gradlew
./gradlew --no-daemon clean bootJar -x test

JAR=$(ls -t build/libs/*.jar | grep -v plain | head -1)
if [[ -z "$JAR" ]]; then
    err "bootJar not found in build/libs"
    exit 1
fi
log "Built: $JAR"

# ── 2. 배치 (TARGET_DIR 상위는 런북에서 ubuntu 소유로 사전 생성) ──
log "Deploying jar to $TARGET_DIR ..."
mkdir -p "$TARGET_DIR"
sudo systemctl stop "$SERVICE" || true
cp "$JAR" "$TARGET_DIR/app.jar"

# ── 3. 기동 ──
log "Starting $SERVICE ..."
sudo systemctl start "$SERVICE"

# ── 4. 헬스체크 ──
log "Waiting for readiness (127.0.0.1:${MGMT_PORT}) ..."
for i in {1..60}; do
    sleep 2
    if curl -fsS "http://127.0.0.1:${MGMT_PORT}/actuator/health/readiness" 2>/dev/null | grep -q '"status":"UP"'; then
        log "API ready (took ${i}*2s)."
        log "✅ Backend deploy complete."
        exit 0
    fi
    if [[ $i -eq 60 ]]; then
        err "API failed to become ready. Recent logs:"
        sudo journalctl -u "$SERVICE" -n 50 --no-pager || true
        exit 1
    fi
done
