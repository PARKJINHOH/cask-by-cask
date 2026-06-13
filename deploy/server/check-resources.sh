#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# 리소스 점검 — 디스크 사용량 + SSL 인증서 만료 임박 시 Slack 알림.
#
# Cron (예: 매시 정각):
#   crontab -e
#   0 * * * * /app/scripts/check-resources.sh >> /app/logs/check-resources.log 2>&1
#
# 임계값은 api.env(또는 환경변수)로 덮어쓸 수 있다. 미설정 시 아래 기본값.
# 같은 항목은 쿨다운(기본 6h) 안에 1회만 알려 도배를 막고, 정상 복귀 시 상태를 리셋한다.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$DIR/slack-notify.sh"

DISK_WARN="${DISK_WARN_PCT:-85}"
DISK_CRIT="${DISK_CRIT_PCT:-95}"
SSL_WARN_DAYS="${SSL_WARN_DAYS:-14}"
SSL_CRIT_DAYS="${SSL_CRIT_DAYS:-3}"
DOMAIN="${HEALTH_DOMAIN:-caskbycask.net}"
COOLDOWN="${ALERT_COOLDOWN_SEC:-21600}"          # 6시간
STATE_DIR="${CBC_STATE_DIR:-/app/logs/.alert-state}"
mkdir -p "$STATE_DIR" 2>/dev/null || true

# 쿨다운 적용 알림 — 같은 key 는 COOLDOWN 내 1회만 전송
notify_cooldown() {  # $1=key $2=level $3=summary $4=body
    local f="$STATE_DIR/$1" now last
    now=$(date +%s)
    last=$( [ -f "$f" ] && cat "$f" 2>/dev/null || echo 0 )
    [ $((now - last)) -lt "$COOLDOWN" ] && return 0
    slack_notify "$2" "$3" "$4"
    echo "$now" > "$f"
}
clear_state() { rm -f "$STATE_DIR/$1" 2>/dev/null || true; }

# ── 1) 디스크 사용량 (실제 마운트만, tmpfs/loop 제외) ──
while read -r pct mount; do
    pct=${pct%\%}
    [ -z "$pct" ] && continue
    key="disk$(printf '%s' "$mount" | tr '/' '_')"
    if [ "$pct" -ge "$DISK_CRIT" ]; then
        notify_cooldown "$key" danger  "서버장애 - 용량부족" "$mount 디스크 사용량 ${pct}% (임계 ${DISK_CRIT}%)"
    elif [ "$pct" -ge "$DISK_WARN" ]; then
        notify_cooldown "$key" warning "디스크 경고"        "$mount 디스크 사용량 ${pct}% (경고 ${DISK_WARN}%)"
    else
        clear_state "$key"
    fi
done < <(df -P -x tmpfs -x devtmpfs -x squashfs -x overlay 2>/dev/null | awk 'NR>1{print $5" "$6}')

# ── 2) SSL 인증서 만료일 (로컬 nginx 에 직접 접속해 읽음 → 파일 권한 불필요) ──
END=$(echo | openssl s_client -servername "$DOMAIN" -connect 127.0.0.1:443 2>/dev/null \
        | openssl x509 -enddate -noout 2>/dev/null | cut -d= -f2)
if [ -n "$END" ]; then
    end_epoch=$(date -d "$END" +%s 2>/dev/null || echo 0)
    days=$(( (end_epoch - $(date +%s)) / 86400 ))
    if [ "$end_epoch" -gt 0 ]; then
        if [ "$days" -le "$SSL_CRIT_DAYS" ]; then
            notify_cooldown ssl danger  "서버장애 - SSL 만료 임박" "$DOMAIN 인증서 ${days}일 후 만료 — 갱신 실패 의심"
        elif [ "$days" -le "$SSL_WARN_DAYS" ]; then
            notify_cooldown ssl warning "SSL 만료 예정"          "$DOMAIN 인증서 ${days}일 후 만료"
        else
            clear_state ssl
        fi
    fi
fi
