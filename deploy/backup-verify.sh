#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DrinkIndex 백업 무결성 검증
#
# 동작:
#   1. 최신 daily 백업 파일 선택
#   2. 임시 MariaDB 컨테이너에 복원
#   3. 주요 테이블 row count 확인
#   4. 결과 Slack 알림
#
# 권장 cron (매주 월요일 04:00):
#   0 4 * * 1 /home/ubuntu/app/drink-index/deploy/backup-verify.sh prod >> /var/log/drinkindex-backup-verify.log 2>&1
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
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BACKUP_DIR="${BACKUP_DIR:-/var/drinkindex/backups/${ENV}}"
LATEST=$(ls -t "$BACKUP_DIR/daily"/*.sql.gz 2>/dev/null | head -1 || true)

if [[ -z "$LATEST" ]]; then
    echo "❌ No backup files found in $BACKUP_DIR/daily" >&2
    exit 1
fi

log()  { printf "\033[1;36m[verify:%s]\033[0m %s\n" "$ENV" "$*"; }

notify_slack() {
    local color="$1" title="$2" text="$3"
    if [[ -z "${SLACK_WEBHOOK_URL:-}" ]]; then return; fi
    curl -fsS -X POST -H 'Content-Type: application/json' \
        -d "{\"attachments\":[{\"color\":\"$color\",\"title\":\"$title\",\"text\":\"$text\"}]}" \
        "$SLACK_WEBHOOK_URL" >/dev/null || true
}

TEST_CONTAINER="di-backup-verify-$$"
TEST_PWD="verify-only-disposable-$(date +%s)"

log "Testing latest backup: $(basename "$LATEST")"
log "Spawning ephemeral MariaDB..."

cleanup() {
    docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --rm --name "$TEST_CONTAINER" \
    -e MARIADB_ROOT_PASSWORD="$TEST_PWD" \
    -e MARIADB_DATABASE=verify \
    mariadb:11.4 >/dev/null

# 기동 대기
for i in {1..30}; do
    sleep 2
    if docker exec "$TEST_CONTAINER" mariadb -u root -p"$TEST_PWD" -e "SELECT 1" >/dev/null 2>&1; then
        break
    fi
    if [[ $i -eq 30 ]]; then
        notify_slack "danger" "Backup verify FAILED ($ENV)" "임시 MariaDB 기동 실패."
        exit 1
    fi
done

log "Restoring backup..."
if ! gunzip -c "$LATEST" | docker exec -i "$TEST_CONTAINER" \
        mariadb -u root -p"$TEST_PWD" verify; then
    notify_slack "danger" "Backup verify FAILED ($ENV)" "복원 중 SQL 오류 — 파일: $(basename "$LATEST")"
    exit 1
fi

log "Verifying key tables..."
TABLES_REPORT=$(docker exec "$TEST_CONTAINER" mariadb -u root -p"$TEST_PWD" -N -B verify <<'SQL'
SELECT CONCAT(TABLE_NAME, ': ', TABLE_ROWS)
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'verify'
  AND TABLE_NAME IN ('users','spirits','reviews','posts','comments','notices','flyway_schema_history')
ORDER BY TABLE_NAME;
SQL
)

if [[ -z "$TABLES_REPORT" ]]; then
    notify_slack "danger" "Backup verify FAILED ($ENV)" "복원 후 핵심 테이블이 없음."
    exit 1
fi

log "Tables:"
echo "$TABLES_REPORT" | sed 's/^/    /'

notify_slack "good" "Backup verify OK ($ENV)" "$(basename "$LATEST")\n\`\`\`\n${TABLES_REPORT}\n\`\`\`"
log "✅ Verify complete."
