#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask DB 백업 (서버에서 실행) — 일배치 / gzip / 3일 보관
#
# 동작:
#   1. /app/env/api.env 에서 DB 계정 로드
#   2. mariadb-dump(단일 트랜잭션) → gzip → /app/db_backup/
#   3. 3일 초과 백업 자동 삭제
#   4. (선택) 실패/성공 Slack 알림 — api.env 의 SLACK_WEBHOOK_URL 있을 때만
#
# Cron (매일 03:00 KST):
#   crontab -e
#   0 3 * * * /app/scripts/backup-db.sh >> /app/logs/backup-db.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV_FILE=/app/env/api.env
BACKUP_DIR=/app/db_backup
DB_NAME=caskbycask_prod
RETENTION_DAYS=3

log() { printf "\033[1;36m[backup]\033[0m %s %s\n" "$(date '+%F %T')" "$*"; }
err() { printf "\033[1;31m[backup]\033[0m %s %s\n" "$(date '+%F %T')" "$*" >&2; }

[ -f "$ENV_FILE" ] || { err "env 파일 없음: $ENV_FILE"; exit 1; }
# DB_USERNAME / DB_PASSWORD / SLACK_* 로드
set -a; . "$ENV_FILE"; set +a

mkdir -p "$BACKUP_DIR"
NOW=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/${DB_NAME}_${NOW}.sql.gz"

notify() {  # $1=color $2=text
    [ -n "${SLACK_WEBHOOK_URL:-}" ] || return 0
    curl -fsS -X POST -H 'Content-Type: application/json' \
        -d "{\"attachments\":[{\"color\":\"$1\",\"title\":\"DB Backup\",\"text\":\"$2\"}]}" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
}

log "덤프 시작: $DB_NAME"
if ! mariadb-dump --host=127.0.0.1 \
        --user="$DB_USERNAME" --password="$DB_PASSWORD" \
        --single-transaction --quick --routines --triggers --skip-lock-tables \
        "$DB_NAME" | gzip > "$FILE"; then
    err "mariadb-dump 실패"
    rm -f "$FILE"
    notify danger "❌ $DB_NAME 백업 실패 — 서버 확인 필요"
    exit 1
fi

SIZE=$(du -h "$FILE" | cut -f1)
log "백업 완료: $(basename "$FILE") ($SIZE)"

# 3일 초과 삭제
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
log "보관 정책 적용(${RETENTION_DAYS}일) 완료"
notify good "✅ $DB_NAME 백업 완료 ($SIZE)"
