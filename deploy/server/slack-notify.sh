#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# 공용 Slack 알림 함수 — 다른 운영 스크립트가 `source` 해서 사용한다.
#
#   . /app/scripts/slack-notify.sh
#   slack_notify <level> <summary> <body>
#     level   : good | warning | danger   (색상/이모지 결정)
#     summary : 상단 요약 한 줄  (예: "서버장애 - 용량부족")
#     body    : 간단 본문        (예: "/ 디스크 사용량 99% (임계 95%)")
#
# 규칙: 메시지는 항상 [요약 한 줄] + [간단 본문] 2단 구조. 길게 쓰지 않는다.
# webhook 미설정 시 조용히 no-op. SLACK_WEBHOOK_URL 이 이미 export 돼 있으면 그대로,
# 없으면 api.env 에서 로드한다. (systemd 유닛은 EnvironmentFile 로 이미 주입됨)
# ─────────────────────────────────────────────────────────────────────────────
CBC_ENV_FILE="${CBC_ENV_FILE:-/app/env/api.env}"
if [ -z "${SLACK_WEBHOOK_URL:-}" ] && [ -f "$CBC_ENV_FILE" ]; then
    set -a; . "$CBC_ENV_FILE"; set +a
fi

# JSON 문자열 이스케이프 (역슬래시/따옴표/개행)
_cbc_json_esc() {
    printf '%s' "$1" \
        | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' \
        | sed ':a;N;$!ba;s/\n/\\n/g'
}

slack_notify() {  # $1=level $2=summary $3=body
    local level="${1:-info}" summary="${2:-}" body="${3:-}"
    [ -n "${SLACK_WEBHOOK_URL:-}" ] || return 0
    local color emoji
    case "$level" in
        good)    color="good";    emoji="✅" ;;
        warning) color="warning"; emoji="⚠️" ;;
        danger)  color="danger";  emoji="🚨" ;;
        *)       color="#888888"; emoji="ℹ️" ;;
    esac
    local host ts payload
    host="$(hostname 2>/dev/null || echo server)"
    ts="$(TZ=Asia/Seoul date '+%F %T KST')"
    payload=$(printf '{"channel":"%s","username":"CaskByCask Ops","icon_emoji":":satellite_antenna:","attachments":[{"color":"%s","title":"%s %s","text":"%s","footer":"%s · %s"}]}' \
        "$(_cbc_json_esc "${SLACK_CHANNEL:-#server-prd}")" \
        "$color" \
        "$emoji" "$(_cbc_json_esc "$summary")" \
        "$(_cbc_json_esc "$body")" \
        "$(_cbc_json_esc "$host")" "$ts")
    curl -fsS -X POST -H 'Content-Type: application/json; charset=utf-8' \
        -d "$payload" "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
}
