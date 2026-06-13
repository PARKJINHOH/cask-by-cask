#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask 점검 모드 토글
#
# 사용법:
#   ./deploy/maintenance.sh dev|prod  on        # 점검 페이지 503 표시
#   ./deploy/maintenance.sh dev|prod  off       # 정상 운영 복귀
#
# 동작:
#   1. .env.{env} 의 MAINTENANCE_MODE 값을 갱신
#   2. web 컨테이너만 재시작 (3~5초 다운타임)
#   3. API 컨테이너는 영향 없음
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV="${1:-}"
MODE="${2:-}"

if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo "Usage: $0 <dev|prod> <on|off>" >&2
    exit 1
fi
if [[ "$MODE" != "on" && "$MODE" != "off" ]]; then
    echo "Usage: $0 <dev|prod> <on|off>" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.${ENV}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.${ENV}.yml"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ $ENV_FILE not found." >&2
    exit 1
fi

# .env 파일의 MAINTENANCE_MODE 값 갱신 (없으면 추가)
if grep -q "^MAINTENANCE_MODE=" "$ENV_FILE"; then
    # GNU/BSD sed 양쪽 호환
    sed -i.bak "s/^MAINTENANCE_MODE=.*/MAINTENANCE_MODE=${MODE}/" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
else
    echo "MAINTENANCE_MODE=${MODE}" >> "$ENV_FILE"
fi

echo "[maintenance:$ENV] Set MAINTENANCE_MODE=$MODE"
echo "[maintenance:$ENV] Recreating web container..."

docker compose --env-file "$ENV_FILE" $COMPOSE_FILES up -d --force-recreate --no-deps web

echo "[maintenance:$ENV] ✅ Web container recreated."
if [[ "$MODE" == "on" ]]; then
    echo "[maintenance:$ENV]    점검 페이지 활성 — 정상화하려면: $0 $ENV off"
else
    echo "[maintenance:$ENV]    정상 운영 복귀."
fi
