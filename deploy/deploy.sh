#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DrinkIndex 배포 스크립트
#
# 사용법:
#   ./deploy/deploy.sh dev      # 개발 환경 배포 (drink-dev.pinner.dev)
#   ./deploy/deploy.sh prod     # 운영 환경 배포
#
# 사전 조건:
#   - 프로젝트 루트에 .env.dev 또는 .env.prod 가 존재
#   - 호스트에 MariaDB 와 Redis 가 설치되어 있고 컨테이너에서 접근 가능
#       · drinkindex_dev / drinkindex_prod 스키마 존재
#       · drink_index 사용자가 docker bridge 에서 접속 가능
#   - docker, docker compose v2 설치
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV="${1:-}"
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo "Usage: $0 <dev|prod>" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.${ENV}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.${ENV}.yml"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ $ENV_FILE not found. Copy from .env.${ENV}.example and fill in." >&2
    exit 1
fi

log() { printf "\033[1;36m[deploy:%s]\033[0m %s\n" "$ENV" "$*"; }
err() { printf "\033[1;31m[deploy:%s]\033[0m %s\n" "$ENV" "$*" >&2; }

# ── 1. Git pull (CI 가 아닌 직접 배포 시) ──
if [[ -d .git ]]; then
    log "Git pull latest..."
    git fetch --quiet
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "$LOCAL")
    if [[ "$LOCAL" != "$REMOTE" ]]; then
        git pull --ff-only
    else
        log "Already up to date."
    fi
fi

# ── 2. 이미지 빌드 ──
log "Building images..."
docker compose --env-file "$ENV_FILE" $COMPOSE_FILES build --pull

# ── 3. 컨테이너 기동 (Flyway 마이그레이션은 Spring Boot 기동 시 자동 수행) ──
log "Starting API + Web..."
docker compose --env-file "$ENV_FILE" $COMPOSE_FILES up -d api web

# ── 4. API 헬스체크 대기 ──
log "Waiting for API readiness..."
for i in {1..60}; do
    sleep 2
    API_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "di-${ENV}-api" 2>/dev/null || echo "starting")
    if [[ "$API_HEALTH" == "healthy" ]]; then
        log "API ready (took ${i}*2s)."
        break
    fi
    if [[ $i -eq 60 ]]; then
        err "API failed to become healthy. Last 50 lines of logs:"
        docker logs --tail 50 "di-${ENV}-api" || true
        exit 1
    fi
done

# ── 5. 미사용 이미지 정리 ──
log "Pruning dangling images..."
docker image prune -f >/dev/null

log "✅ Deployment complete."
log "   API:   http://localhost:8080  (internal)"
log "   Web:   http://localhost:80    (via nginx)"
log "   Mgmt:  http://localhost:8081/actuator/health (internal)"
