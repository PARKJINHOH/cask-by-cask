#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ⏸️ 보류(미적용) — caskbycask-crawler 가 운영에 반영되기 전까지는 활성화하지 않는다.
#    이 외부 헬스체크는 "크롤러용 시놀로지 DS220+ 가 상시 켜져 있다"는 전제에 의존한다.
#    크롤러를 운영에 올릴 때 시놀로지가 상시 가동되므로, 그때 아래 절차대로 등록한다.
#    (그 전까지 VM 통째 다운 감지는 공백 → 임시로는 UptimeRobot 등 무료 외부 모니터로 대체 가능)
# ─────────────────────────────────────────────────────────────────────────────
# 외부 헬스체크 — 시놀로지 DS220+ 에서 실행한다. (★ VM 통째 다운 감지)
#
# 왜 외부인가:
#   배포/크래시 알람은 모두 "서버 안"에서 도는 알람이라, Oracle VM 이 통째로 죽으면
#   (커널패닉/네트워크 단절/OCI 점검 등) 아무 알림도 못 뜬다. 외부의 다른 기계에서
#   주기적으로 /healthz 를 찔러봐야 진짜 다운을 잡을 수 있다.
#   마침 크롤러용 시놀로지가 상시 켜져 있으니 거기서 함께 돌린다.
#
# 설치 (시놀로지):
#   1) 이 파일을 예: /volume1/scripts/healthcheck.sh 로 복사 (chmod +x)
#   2) 아래 SLACK_WEBHOOK_URL 을 채우거나, 작업 스케줄러의 환경변수로 주입
#   3) DSM 제어판 > 작업 스케줄러 > 예약된 작업 > 사용자 정의 스크립트
#      - 사용자: root, 일정: 5분마다
#      - 명령:  bash /volume1/scripts/healthcheck.sh >> /volume1/scripts/healthcheck.log 2>&1
#   (또는 crontab:  */5 * * * * bash /volume1/scripts/healthcheck.sh >> ... 2>&1)
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

URL="${HEALTH_URL:-https://caskbycask.net/healthz}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-PASTE_WEBHOOK_URL_HERE}"
SLACK_CHANNEL="${SLACK_CHANNEL:-#server-prd}"
TIMEOUT="${HEALTH_TIMEOUT:-10}"
FAILS_TO_ALERT="${FAILS_TO_ALERT:-2}"            # 연속 N회 실패해야 다운 판정(일시 흔들림 무시)
STATE="${HEALTH_STATE:-/tmp/cbc-health.state}"   # UP | DOWN
FAILS="${HEALTH_FAILS:-/tmp/cbc-health.fails}"

notify() {  # $1=color $2=summary $3=body
    [ "${SLACK_WEBHOOK_URL}" != "PASTE_WEBHOOK_URL_HERE" ] || return 0
    curl -fsS -X POST -H 'Content-Type: application/json; charset=utf-8' \
        -d "{\"channel\":\"$SLACK_CHANNEL\",\"username\":\"CaskByCask Watchdog\",\"icon_emoji\":\":satellite_antenna:\",\"attachments\":[{\"color\":\"$1\",\"title\":\"$2\",\"text\":\"$3\"}]}" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
}

code=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$URL" 2>/dev/null || echo 000)
prev=$(cat "$STATE" 2>/dev/null || echo UP)
fails=$(cat "$FAILS" 2>/dev/null || echo 0)

if [ "$code" = "200" ]; then
    echo 0 > "$FAILS"
    if [ "$prev" = "DOWN" ]; then
        notify good "✅ 서비스 복구" "$URL 응답 정상(200) — 다운에서 복구됨."
    fi
    echo UP > "$STATE"
else
    fails=$((fails + 1)); echo "$fails" > "$FAILS"
    if [ "$fails" -ge "$FAILS_TO_ALERT" ] && [ "$prev" != "DOWN" ]; then
        notify danger "🚨 서버장애 - 서비스 다운" "$URL 응답 실패(HTTP $code), 연속 ${fails}회. Oracle VM/네트워크 확인 필요."
        echo DOWN > "$STATE"
    fi
fi
