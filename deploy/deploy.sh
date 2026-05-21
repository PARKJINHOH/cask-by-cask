#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DrinkIndex 배포 스크립트
#
# 사용법:
#   ./deploy/deploy.sh dev      # NAS 개발 환경 배포
#   ./deploy/deploy.sh prod     # Oracle Cloud 운영 환경 배포
#
# 사전 조건:
#   - 프로젝트 루트에 .env.dev 또는 .env.prod 가 존재
#   - docker, docker compose v2 설치
#   - git 로그인 (private repo 인 경우)
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

# ── 3. 컨테이너 기동 (DB/Redis 먼저, 그 후 API/Web) ──
log "Starting infrastructure (mariadb, redis)..."
docker compose --env-file "$ENV_FILE" $COMPOSE_FILES up -d mariadb redis

log "Waiting for DB/Redis healthchecks..."
for i in {1..30}; do
    sleep 2
    DB_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "di-${ENV}-mariadb" 2>/dev/null || echo "starting")
    REDIS_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "di-${ENV}-redis" 2>/dev/null || echo "starting")
    if [[ "$DB_HEALTH" == "healthy" && "$REDIS_HEALTH" == "healthy" ]]; then
        log "Infrastructure ready."
        break
    fi
    if [[ $i -eq 30 ]]; then
        err "Infrastructure failed to become healthy (db=$DB_HEALTH, redis=$REDIS_HEALTH)"
        exit 1
    fi
done

# ── 4. API + Web 기동 (Flyway 마이그레이션은 Spring Boot 기동 시 자동 수행) ──
log "Starting API + Web..."
docker compose --env-file "$ENV_FILE" $COMPOSE_FILES up -d api web

# ── 5. API 헬스체크 대기 ──
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

# ── 6. 미사용 이미지 정리 ──
log "Pruning dangling images..."
docker image prune -f >/dev/null

log "✅ Deployment complete."
log "   API:   http://localhost:8080  (internal)"
log "   Web:   http://localhost:80    (via nginx)"
log "   Mgmt:  http://localhost:8081/actuator/health (internal)"
