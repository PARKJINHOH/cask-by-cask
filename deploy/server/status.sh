#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask 운영 상태 확인 — API + Web(nginx) 서비스 상태를 한눈에 출력
#
# 사용:
#   ./status.sh          # 전체 요약
#   ./status.sh --log    # 요약 + 최근 로그 20줄 추가 출력
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

SHOW_LOG=false
[[ "${1:-}" == "--log" ]] && SHOW_LOG=true

API_SERVICE=caskbycask-api
WEB_SERVICE=caskbycask-web
NGINX_SERVICE=nginx
HEALTH_URL=http://127.0.0.1:8081/actuator/health/readiness
WEB_HEALTH_URL=http://127.0.0.1:3000/healthz
FRONT_URL=http://127.0.0.1:80
APP_JAR=/app/spring-boot/app.jar
DIST_DIR=/app/next/dist
LOG_LINES=20

# ── 색상 ──────────────────────────────────────────────────────────────────────
C_RESET="\033[0m"
C_BOLD="\033[1m"
C_GREEN="\033[1;32m"
C_RED="\033[1;31m"
C_YELLOW="\033[1;33m"
C_CYAN="\033[1;36m"
C_MAGENTA="\033[1;35m"
C_GRAY="\033[0;90m"

# ── 헬퍼 ──────────────────────────────────────────────────────────────────────
ok()   { printf "  ${C_GREEN}✔${C_RESET}  %s\n" "$*"; }
fail() { printf "  ${C_RED}✘${C_RESET}  %s\n" "$*"; }
warn() { printf "  ${C_YELLOW}!${C_RESET}  %s\n" "$*"; }
info() { printf "  ${C_GRAY}·${C_RESET}  %s\n" "$*"; }

section() { printf "\n${C_BOLD}${C_CYAN}▶ %s${C_RESET}\n" "$*"; }
divider() { printf "${C_GRAY}────────────────────────────────────────────────────────────${C_RESET}\n"; }

# systemd 서비스 상태 반환: "active" / "inactive" / "failed" / "unknown"
svc_state() {
    systemctl is-active "$1" 2>/dev/null || echo "unknown"
}

# HTTP 응답 코드
http_code() {
    curl -o /dev/null -fsS -w "%{http_code}" --max-time 5 "$1" 2>/dev/null || echo "ERR"
}

# ── 헤더 ─────────────────────────────────────────────────────────────────────
printf "\n${C_BOLD}CaskByCask 운영 상태${C_RESET}  ${C_GRAY}$(date '+%Y-%m-%d %H:%M:%S')${C_RESET}\n"
divider

# ── 1) API 서비스 ─────────────────────────────────────────────────────────────
section "API  ($API_SERVICE)"

api_state=$(svc_state "$API_SERVICE")
case "$api_state" in
  active)  ok   "systemd: active (running)" ;;
  failed)  fail "systemd: failed" ;;
  *)       fail "systemd: $api_state" ;;
esac

# PID / 메모리 / 업타임
pid=$(systemctl show -p MainPID --value "$API_SERVICE" 2>/dev/null || echo "")
if [[ "$pid" =~ ^[1-9][0-9]*$ ]]; then
    mem_kb=$(awk '/VmRSS/{print $2}' /proc/$pid/status 2>/dev/null || echo "")
    if [ -n "$mem_kb" ]; then
        mem_mb=$(( mem_kb / 1024 ))
        info "PID $pid  |  메모리 ${mem_mb} MB"
    else
        info "PID $pid"
    fi
    uptime_sec=$(awk '{print int($1)}' /proc/$pid/stat 2>/dev/null || echo "")
    svc_since=$(systemctl show -p ActiveEnterTimestamp --value "$API_SERVICE" 2>/dev/null || echo "")
    [ -n "$svc_since" ] && info "기동 시각: $svc_since"
fi

# jar 파일
if [ -f "$APP_JAR" ]; then
    jar_size=$(du -sh "$APP_JAR" 2>/dev/null | cut -f1)
    jar_time=$(stat -c '%y' "$APP_JAR" 2>/dev/null | cut -d'.' -f1)
    info "jar: $APP_JAR  (${jar_size}, 수정 $jar_time)"
else
    warn "jar 없음: $APP_JAR"
fi

# 헬스체크
health_json=$(curl -fsS --max-time 5 "$HEALTH_URL" 2>/dev/null || echo "")
if echo "$health_json" | grep -q '"status":"UP"'; then
    ok "헬스체크: UP  ($HEALTH_URL)"
elif [ -n "$health_json" ]; then
    warn "헬스체크: $health_json"
else
    fail "헬스체크: 응답 없음  ($HEALTH_URL)"
fi

# 로그
if $SHOW_LOG; then
    printf "\n${C_GRAY}  ── 최근 로그 (journalctl -u $API_SERVICE -n $LOG_LINES) ──${C_RESET}\n"
    journalctl -u "$API_SERVICE" -n "$LOG_LINES" --no-pager -o short-monotonic 2>/dev/null \
        | sed 's/^/  /'
fi

# ── 2) Web / Next.js / Nginx ──────────────────────────────────────────────────
section "Web / Next.js / Nginx"

# Next.js systemd 서비스 상태
web_state=$(svc_state "$WEB_SERVICE")
case "$web_state" in
  active)  ok   "Next.js systemd: active (running)" ;;
  failed)  fail "Next.js systemd: failed" ;;
  *)       fail "Next.js systemd: $web_state" ;;
esac

# Nginx systemd 서비스 상태
nginx_state=$(svc_state "$NGINX_SERVICE")
case "$nginx_state" in
  active)  ok   "Nginx systemd: active (running)" ;;
  failed)  fail "Nginx systemd: failed" ;;
  *)       fail "Nginx systemd: $nginx_state" ;;
esac

# dist 디렉토리
if [ -d "$DIST_DIR" ]; then
    dist_count=$(find "$DIST_DIR" -type f 2>/dev/null | wc -l)
    dist_time=$(stat -c '%y' "$DIST_DIR" 2>/dev/null | cut -d'.' -f1)
    info "dist: $DIST_DIR  (파일 ${dist_count}개, 수정 $dist_time)"
else
    warn "dist 없음: $DIST_DIR"
fi

# Next.js 헬스체크 (3000포트)
web_health_code=$(http_code "$WEB_HEALTH_URL")
if [ "$web_health_code" = "200" ]; then
    ok "Next.js 헬스체크: OK  ($WEB_HEALTH_URL)"
else
    fail "Next.js 헬스체크: 실패 (HTTP $web_health_code)  ($WEB_HEALTH_URL)"
fi

# nginx 설정 검증
nginx_check=$(sudo nginx -t 2>&1 || true)
if echo "$nginx_check" | grep -q "syntax is ok"; then
    ok "nginx 설정: syntax ok"
else
    fail "nginx 설정 오류:"
    echo "$nginx_check" | sed 's/^/    /'
fi

# HTTP 응답 (외부포트 80)
front_code=$(http_code "$FRONT_URL")
if [ "$front_code" = "200" ] || [ "$front_code" = "301" ] || [ "$front_code" = "302" ]; then
    ok "외부 HTTP $front_code  ($FRONT_URL)"
else
    fail "외부 HTTP $front_code  ($FRONT_URL)"
fi

# 로그
if $SHOW_LOG; then
    printf "\n${C_GRAY}  ── Next.js 최근 로그 (journalctl -u $WEB_SERVICE -n $LOG_LINES) ──${C_RESET}\n"
    journalctl -u "$WEB_SERVICE" -n "$LOG_LINES" --no-pager -o short-monotonic 2>/dev/null | sed 's/^/  /'
    printf "\n${C_GRAY}  ── nginx 최근 에러 로그 (tail -n $LOG_LINES) ──${C_RESET}\n"
    NGINX_ERR_LOG=$(nginx -V 2>&1 | grep -oP '(?<=--error-log-path=)\S+' 2>/dev/null || echo "/var/log/nginx/error.log")
    tail -n "$LOG_LINES" "$NGINX_ERR_LOG" 2>/dev/null | sed 's/^/  /' || info "(로그 없음)"
fi

# ── 3) 시스템 리소스 ──────────────────────────────────────────────────────────
section "시스템 리소스"

# 디스크
df -Ph / 2>/dev/null | awk 'NR==2{
    printf "  · 디스크  %s 사용 / %s 전체  (%s)\n", $3, $2, $5
}'

# 메모리
if [ -f /proc/meminfo ]; then
    total_kb=$(awk '/MemTotal/{print $2}' /proc/meminfo)
    avail_kb=$(awk '/MemAvailable/{print $2}' /proc/meminfo)
    used_kb=$(( total_kb - avail_kb ))
    total_mb=$(( total_kb / 1024 ))
    used_mb=$(( used_kb / 1024 ))
    pct=$(( used_mb * 100 / total_mb ))
    printf "  · 메모리  %d MB 사용 / %d MB 전체  (%d%%)\n" "$used_mb" "$total_mb" "$pct"
fi

# CPU Load
load=$(awk '{print $1" "$2" "$3}' /proc/loadavg 2>/dev/null || uptime | awk -F'load average:' '{print $2}')
printf "  · Load avg  %s\n" "$load"

# ── 4) 결론 ──────────────────────────────────────────────────────────────────
divider

ALL_OK=true
[[ "$api_state" != "active" ]]   && ALL_OK=false
[[ "$web_state" != "active" ]]   && ALL_OK=false
[[ "$nginx_state" != "active" ]] && ALL_OK=false
echo "$health_json" | grep -q '"status":"UP"' || ALL_OK=false
[[ "$web_health_code" != "200" ]] && ALL_OK=false

if $ALL_OK; then
    printf "${C_GREEN}${C_BOLD}  ✔ 모든 서비스 정상${C_RESET}\n\n"
else
    printf "${C_RED}${C_BOLD}  ✘ 일부 서비스 이상 — 위 항목 확인 필요${C_RESET}\n\n"
fi
