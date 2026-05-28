# ─────────────────────────────────────────────────────────────────────────────
# DrinkIndex Web — Multi-stage build (Vite SPA → Nginx)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /workspace

# 빌드 명령 선택 — dev: "build:no-prerender" (puppeteer 건너뜀), prod: "build"
# alpine 에는 Chromium 이 없어 prerender 가 실패하므로 dev 는 prerender 생략.
# (prod 에서 prerender 가 필요하면 이 이미지에 chromium 설치 + PUPPETEER_EXECUTABLE_PATH 지정 필요)
ARG BUILD_CMD=build
ENV PUPPETEER_SKIP_DOWNLOAD=true

# 의존성 캐시 레이어
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# 소스 복사 + 빌드
COPY . .
RUN npm run ${BUILD_CMD}

# ─────────────────────────────────────────────────────────────────────────────
# Runtime stage — Nginx 정적 서빙 + /api 리버스 프록시 + 점검 토글
FROM nginx:1.27-alpine
RUN apk add --no-cache gettext curl

# 빌드 산출물
COPY --from=builder /workspace/dist /usr/share/nginx/html

# Nginx 설정 템플릿 (envsubst 로 환경변수 치환)
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/maintenance.html /usr/share/nginx/html/maintenance.html

# 환경변수 기본값
ENV API_HOST=api \
    API_PORT=8080 \
    MAINTENANCE_MODE=off \
    ROBOTS_NOINDEX=off

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1/healthz || exit 1
