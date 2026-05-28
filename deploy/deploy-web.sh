#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DrinkIndex 프론트엔드 배포 (Docker 미사용 / 정적파일 + 네이티브 nginx)
#
# 사용법:  ./deploy/deploy-web.sh dev
#
# 동작:
#   1. npm ci + vite build (prerender 제외)
#   2. dist 를 /var/www/drinkindex-<env>/ 로 rsync (--delete)
#
# 정적파일이라 서비스 재시작 불필요. nginx 는 그대로 새 파일 서빙.
#
# 사전 조건:
#   - Node 20, /var/www/drinkindex-<env> 가 배포 유저 쓰기 가능
#   - 네이티브 nginx 사이트(drinkindex-<env>.conf) 설치 완료
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV="${1:-}"
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo "Usage: $0 <dev|prod>" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_ROOT="/var/www/drinkindex-${ENV}"

log() { printf "\033[1;36m[web:%s]\033[0m %s\n" "$ENV" "$*"; }

# ── 1. 빌드 ──
log "Building SPA (no prerender)..."
cd "$ROOT_DIR/drinkindex-web"
npm ci --no-audit --no-fund
# VITE_API_BASE_URL 미설정 → 상대경로(/api) 사용 (axiosInstance 가 빈 문자열 fallback)
npm run build:no-prerender

# ── 2. 배치 (WEB_ROOT 는 런북에서 ubuntu 소유로 사전 생성) ──
log "Syncing dist → $WEB_ROOT ..."
mkdir -p "$WEB_ROOT"
rsync -a --delete dist/ "$WEB_ROOT/"

log "✅ Frontend deploy complete."
