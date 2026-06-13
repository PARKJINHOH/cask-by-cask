#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# systemd 훅 — API 서비스의 비정상 종료 / 기동을 Slack 으로 알린다.
#
# 서비스 유닛(caskbycask-api.service)에서:
#   ExecStartPost=/app/scripts/notify-systemd.sh start
#   ExecStopPost=/app/scripts/notify-systemd.sh stop
#
# 핵심: `systemctl stop|restart`(= stop-api.sh / 배포의 정상 종료)는
#       SIGTERM → exit 143 → SuccessExitStatus=143 → $SERVICE_RESULT=success → 무알림.
#       크래시 / OOM킬 / 비정상 exit 만 "서버장애" 로 알림.
#   (참고: 이 알림은 서버 내부에서 동작 → VM 자체가 죽으면 못 뜬다.
#          외부 감시(synology/healthcheck.sh)는 크롤러 운영 반영 시 활성화 예정 — 현재 보류)
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$DIR/slack-notify.sh"

SERVICE=caskbycask-api
ACTION="${1:-stop}"

case "$ACTION" in
  start)
    slack_notify good "API 기동" "$SERVICE 서비스 시작됨 (배포 또는 장애 복구)."
    ;;
  stop)
    # systemd 가 ExecStopPost 에 넘기는 변수: SERVICE_RESULT / EXIT_CODE / EXIT_STATUS
    RESULT="${SERVICE_RESULT:-unknown}"
    [ "$RESULT" = "success" ] && exit 0   # 정상 종료(sh/배포) → 무알림

    DETAIL="원인=$RESULT"
    [ -n "${EXIT_CODE:-}" ]   && DETAIL="$DETAIL, code=${EXIT_CODE}"
    [ -n "${EXIT_STATUS:-}" ] && DETAIL="$DETAIL, status=${EXIT_STATUS}"

    # 최근 에러 로그 한두 줄 첨부 (있을 때만)
    TAIL="$(journalctl -u "$SERVICE" -p err -n 2 --no-pager -o cat 2>/dev/null | tr '\n' ' ' | cut -c1-300)"
    BODY="$SERVICE 비정상 종료 ($DETAIL)"
    [ -n "$TAIL" ] && BODY="$BODY"$'\n'"최근로그: $TAIL"

    slack_notify danger "서버장애 - API 비정상 종료" "$BODY"
    ;;
esac
