#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DrinkIndex 프론트엔드 배포 (Docker 미사용 / 정적파일 + 네이티브 nginx)
#
# 사용법:  ./deploy/deploy-web.sh dev
#
# 동작:
#   1. npm ci + vite build
#   2. (prod) SEO prerender — dist 의 정적 라우트를 HTML 스냅샷으로 덮어씀 (실패해도 배포 계속)
#   3. dist 를 /var/www/drinkindex-<env>/ 로 rsync (--delete)
#
# 정적파일이라 서비스 재시작 불필요. nginx 는 그대로 새 파일 서빙.
#
# 사전 조건:
#   - Node 20, /var/www/drinkindex-<env> 가 배포 유저 쓰기 가능
#   - 네이티브 nginx 사이트(drinkindex-<env>.conf) 설치 완료
#   - (prod prerender) 서버에 Chromium + 의존 라이브러리 설치 → deploy.md "프론트 SEO prerender 배포" 참고
#     · 미설치 시 prerender 단계만 경고 후 건너뜀(SEO 저하). dist 빌드/배포는 정상 진행됨.
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
log "Building SPA..."
cd "$ROOT_DIR/drinkindex-web"
npm ci --no-audit --no-fund
# VITE_API_BASE_URL 미설정 → 상대경로(/api) 사용 (axiosInstance 가 빈 문자열 fallback)
# 항상 vite build 만 먼저 수행해 dist 를 확정(= 배포는 prerender 성공 여부와 무관하게 보장).
npm run build:no-prerender

# ── 1-1. (prod 전용) SEO prerender ──
# 정적 라우트를 puppeteer 로 렌더해 dist/<route>/index.html 스냅샷 생성(크롤러용 JSON-LD/메타).
# 실패해도(예: Chromium 미설치) 배포를 막지 않고 경고만 — SPA 셸로 graceful degrade.
# dev 는 ROBOTS_NOINDEX=on(색인 차단)이라 prerender 불필요 → 건너뜀.
if [[ "$ENV" == "prod" ]]; then
    log "Prerendering SEO snapshots..."
    if npm run prerender; then
        log "✅ Prerender complete."
    else
        log "⚠️  Prerender FAILED — SPA 셸로 서빙(SEO 저하). 서버 Chromium 설치 확인: deploy.md 참고."
    fi
fi

# ── 2. 배치 (WEB_ROOT 는 런북에서 ubuntu 소유로 사전 생성) ──
log "Syncing dist → $WEB_ROOT ..."
mkdir -p "$WEB_ROOT"
rsync -a --delete dist/ "$WEB_ROOT/"

log "✅ Frontend deploy complete."
