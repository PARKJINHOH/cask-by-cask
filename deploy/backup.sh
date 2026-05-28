#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DrinkIndex DB 백업 (GFS: Grandfather-Father-Son)
#
# 사용법:
#   ./deploy/backup.sh dev|prod
#
# 동작:
#   1. 호스트의 MariaDB 에서 mariadb-dump 실행 (drink_index 사용자 사용)
#   2. gzip 압축 후 /var/drinkindex/backups/ 에 저장
#   3. Oracle Object Storage 업로드 (OCI CLI 필요, 옵션)
#   4. 보관 정책: 일간 7개 + 주간 4개 + 월간 6개
#   5. Slack 알림 (성공/실패) — SLACK_WEBHOOK_URL env var 가 있을 때만
#
# 사전 조건:
#   - 호스트에 mariadb-client (mariadb-dump) 설치
#       sudo apt-get install -y mariadb-client
#   - .env.${ENV} 에 DB_USERNAME / DB_PASSWORD 설정
#
# Cron 예시 (매일 03:00 KST):
#   0 3 * * * /opt/drinkindex/deploy/backup.sh prod >> /var/log/drinkindex-backup.log 2>&1
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
if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ $ENV_FILE not found." >&2
    exit 1
fi
# .env 로드 (모든 변수 export)
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BACKUP_DIR="${BACKUP_DIR:-/var/drinkindex/backups/${ENV}}"
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly"

NOW=$(date +'%Y%m%d_%H%M%S')
DAY_OF_WEEK=$(date +'%u')  # 1=Mon ... 7=Sun
DAY_OF_MONTH=$(date +'%d')

DAILY_FILE="$BACKUP_DIR/daily/drinkindex_${ENV}_${NOW}.sql.gz"
DB_NAME="drinkindex_${ENV}"

log()  { printf "\033[1;36m[backup:%s]\033[0m %s\n" "$ENV" "$*"; }
err()  { printf "\033[1;31m[backup:%s]\033[0m %s\n" "$ENV" "$*" >&2; }

notify_slack() {
    local color="$1" title="$2" text="$3"
    if [[ -z "${SLACK_WEBHOOK_URL:-}" ]]; then return; fi
    curl -fsS -X POST -H 'Content-Type: application/json' \
        -d "{\"attachments\":[{\"color\":\"$color\",\"title\":\"$title\",\"text\":\"$text\"}]}" \
        "$SLACK_WEBHOOK_URL" >/dev/null || true
}

# ── 1. mariadb-dump (호스트 MariaDB, 단일 트랜잭션) ──
log "Dumping $DB_NAME from host MariaDB..."
if ! mariadb-dump \
        --host=127.0.0.1 \
        --user="$DB_USERNAME" --password="$DB_PASSWORD" \
        --single-transaction --quick --routines --triggers \
        --skip-comments --skip-lock-tables \
        "$DB_NAME" \
        | gzip > "$DAILY_FILE"; then
    err "mariadb-dump failed."
    notify_slack "danger" "DB Backup FAILED ($ENV)" "mariadb-dump 실패. 서버 확인 필요."
    exit 1
fi

SIZE=$(du -h "$DAILY_FILE" | cut -f1)
log "Daily backup created: $DAILY_FILE ($SIZE)"

# ── 2. 주간/월간 사본 (일요일=주간, 1일=월간) ──
if [[ "$DAY_OF_WEEK" == "7" ]]; then
    cp "$DAILY_FILE" "$BACKUP_DIR/weekly/drinkindex_${ENV}_W_${NOW}.sql.gz"
    log "Weekly snapshot created."
fi
if [[ "$DAY_OF_MONTH" == "01" ]]; then
    cp "$DAILY_FILE" "$BACKUP_DIR/monthly/drinkindex_${ENV}_M_${NOW}.sql.gz"
    log "Monthly snapshot created."
fi

# ── 3. 보관 정책 적용 (일7 / 주4 / 월6) ──
find "$BACKUP_DIR/daily"   -name '*.sql.gz' -mtime +7   -delete
find "$BACKUP_DIR/weekly"  -name '*.sql.gz' -mtime +28  -delete
find "$BACKUP_DIR/monthly" -name '*.sql.gz' -mtime +180 -delete

# ── 4. Oracle Object Storage 업로드 (OCI CLI 필요) ──
if command -v oci >/dev/null 2>&1 && [[ -n "${OCI_BUCKET:-}" ]]; then
    log "Uploading to Oracle Object Storage (bucket: $OCI_BUCKET)..."
    if oci os object put \
            --bucket-name "$OCI_BUCKET" \
            --file "$DAILY_FILE" \
            --name "drinkindex-backups/${ENV}/daily/$(basename "$DAILY_FILE")" \
            --force >/dev/null; then
        log "Object Storage upload OK."
    else
        err "Object Storage upload failed (local copy retained)."
        notify_slack "warning" "DB Backup partial ($ENV)" "Local OK, Object Storage 업로드 실패."
    fi
else
    log "OCI CLI 미설치 또는 OCI_BUCKET 미설정 — 로컬 저장만 진행."
fi

notify_slack "good" "DB Backup OK ($ENV)" "백업 완료: $SIZE\n파일: $(basename "$DAILY_FILE")"
log "✅ Backup complete."
