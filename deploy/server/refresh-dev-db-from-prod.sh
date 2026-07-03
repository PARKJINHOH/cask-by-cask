#!/usr/bin/env bash
# 운영 서버에서 caskbycask_prod 스냅샷으로 caskbycask_dev 를 갱신한다.
#
# 안전 모델:
# - caskbycask_prod 는 mariadb-dump 로 읽기만 한다.
# - 먼저 임시 DB에 restore 한다.
# - 임시 DB에서 운영 계정/개인정보를 제거한다.
# - 현재 caskbycask_dev 를 백업한다.
# - caskbycask_dev 만 교체한다.
#
# 사용법:
#   /app/scripts/refresh-dev-db-from-prod.sh
#   /app/scripts/refresh-dev-db-from-prod.sh --yes
set -euo pipefail

ENV_FILE=${ENV_FILE:-/app/env/api.env}
SOURCE_DB=${SOURCE_DB:-caskbycask_prod}
TARGET_DB=${TARGET_DB:-caskbycask_dev}
TMP_DB=${TMP_DB:-caskbycask_dev_refresh_tmp}
DB_PORT=${DB_PORT:-3306}
BACKUP_DIR=${DEV_REFRESH_BACKUP_DIR:-/app/db_backup/dev_refresh}
RETENTION_DAYS=${DEV_REFRESH_RETENTION_DAYS:-7}
SKIP_TARGET_BACKUP=${SKIP_TARGET_BACKUP:-false}

ASSUME_YES=false
for arg in "$@"; do
    case "$arg" in
        -y|--yes)
            ASSUME_YES=true
            ;;
        *)
            printf "Unknown argument: %s\n" "$arg" >&2
            exit 2
            ;;
    esac
done

log() { printf "\033[1;36m[dev-db-refresh]\033[0m %s %s\n" "$(date '+%F %T')" "$*"; }
warn() { printf "\033[1;33m[dev-db-refresh]\033[0m %s %s\n" "$(date '+%F %T')" "$*" >&2; }
err() { printf "\033[1;31m[dev-db-refresh]\033[0m %s %s\n" "$(date '+%F %T')" "$*" >&2; }

require_cmd() {
    command -v "$1" >/dev/null 2>&1 || { err "Required command not found: $1"; exit 1; }
}

require_db_name() {
    local name="$1"
    if [[ ! "$name" =~ ^[A-Za-z0-9_]+$ ]]; then
        err "Unsafe database name: $name"
        exit 1
    fi
}

write_client_cnf() {
    local file="$1"
    local user="$2"
    local password="$3"
    umask 077
    {
        printf "[client]\n"
        printf "host=%s\n" "${DB_HOST:-127.0.0.1}"
        printf "port=%s\n" "$DB_PORT"
        printf "user=%s\n" "$user"
        printf "password=%s\n" "$password"
        printf "default-character-set=utf8mb4\n"
    } > "$file"
}

[ -f "$ENV_FILE" ] || { err "Env file not found: $ENV_FILE"; exit 1; }
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

require_cmd mariadb
require_cmd mariadb-dump
require_cmd gzip
require_cmd gunzip
require_cmd mktemp

require_db_name "$SOURCE_DB"
require_db_name "$TARGET_DB"
require_db_name "$TMP_DB"

if [ "$SOURCE_DB" = "$TARGET_DB" ] || [ "$SOURCE_DB" = "$TMP_DB" ] || [ "$TARGET_DB" = "$TMP_DB" ]; then
    err "SOURCE_DB, TARGET_DB, and TMP_DB must be different"
    exit 1
fi

SOURCE_USER=${PROD_DB_READONLY_USERNAME:-${DB_USERNAME:-}}
SOURCE_PASSWORD=${PROD_DB_READONLY_PASSWORD:-${DB_PASSWORD:-}}
ADMIN_USER=${DEV_REFRESH_DB_USERNAME:-${DB_USERNAME:-}}
ADMIN_PASSWORD=${DEV_REFRESH_DB_PASSWORD:-${DB_PASSWORD:-}}

[ -n "$SOURCE_USER" ] || { err "Missing PROD_DB_READONLY_USERNAME or DB_USERNAME"; exit 1; }
[ -n "$SOURCE_PASSWORD" ] || { err "Missing PROD_DB_READONLY_PASSWORD or DB_PASSWORD"; exit 1; }
[ -n "$ADMIN_USER" ] || { err "Missing DEV_REFRESH_DB_USERNAME or DB_USERNAME"; exit 1; }
[ -n "$ADMIN_PASSWORD" ] || { err "Missing DEV_REFRESH_DB_PASSWORD or DB_PASSWORD"; exit 1; }

if [ "$ASSUME_YES" != "true" ]; then
    warn "This will replace database '$TARGET_DB' with a sanitized copy of '$SOURCE_DB'."
    warn "The production database is dump-only, but '$TARGET_DB' will be dropped and recreated."
    if [ -t 0 ]; then
        printf "Type REFRESH_%s to continue: " "$TARGET_DB" >/dev/tty
        read -r answer </dev/tty
        if [ "$answer" != "REFRESH_${TARGET_DB}" ]; then
            err "Cancelled"
            exit 1
        fi
    else
        err "Interactive confirmation is required. Re-run with --yes for non-interactive execution."
        exit 1
    fi
fi

TMP_DIR=$(mktemp -d)
SOURCE_CNF="$TMP_DIR/source.cnf"
ADMIN_CNF="$TMP_DIR/admin.cnf"
SOURCE_DUMP="$TMP_DIR/${SOURCE_DB}.sql.gz"
SANITIZED_DUMP="$TMP_DIR/${TMP_DB}.sanitized.sql.gz"
cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

write_client_cnf "$SOURCE_CNF" "$SOURCE_USER" "$SOURCE_PASSWORD"
write_client_cnf "$ADMIN_CNF" "$ADMIN_USER" "$ADMIN_PASSWORD"

mkdir -p "$BACKUP_DIR"
NOW=$(date +%Y%m%d_%H%M%S)
TARGET_BACKUP="$BACKUP_DIR/${TARGET_DB}_${NOW}_before_refresh.sql.gz"

mysql_admin() {
    mariadb --defaults-extra-file="$ADMIN_CNF" "$@"
}

dump_db() {
    local cnf="$1"
    local db="$2"
    mariadb-dump --defaults-extra-file="$cnf" \
        --single-transaction --quick --routines --triggers --skip-lock-tables \
        "$db"
}

log "Verifying access to source database: $SOURCE_DB"
mysql_admin --execute "SELECT 1" >/dev/null
mariadb --defaults-extra-file="$SOURCE_CNF" --execute "SELECT 1" "$SOURCE_DB" >/dev/null

log "Dumping source database: $SOURCE_DB"
dump_db "$SOURCE_CNF" "$SOURCE_DB" | gzip > "$SOURCE_DUMP"

log "Preparing temporary database: $TMP_DB"
mysql_admin --execute "DROP DATABASE IF EXISTS \`$TMP_DB\`; CREATE DATABASE \`$TMP_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

log "Restoring source dump into temporary database"
gunzip -c "$SOURCE_DUMP" | mysql_admin "$TMP_DB"

log "Sanitizing temporary database"
mysql_admin "$TMP_DB" <<SQL
SET @now = NOW(6);
SET @sentinel_email = 'withdrawn@caskbycask.system';
SET @sentinel_nickname = CONVERT(0xED8388ED87B4ED959CED82ACEC9A9CEC9E90 USING utf8mb4);
SET @dev_sentinel_id = COALESCE((SELECT MIN(id) FROM users), 1);

INSERT INTO users (
    adult_verified,
    consecutive_attendance,
    current_level,
    dormant,
    email_subscribed,
    email_verified,
    is_active,
    maturing_power,
    must_change_password,
    nickname_fixed,
    created_at,
    id,
    nickname,
    updated_at,
    email,
    password,
    role,
    signup_method
)
SELECT
    1,
    0,
    1,
    0,
    0,
    1,
    1,
    0,
    0,
    0,
    @now,
    @dev_sentinel_id,
    @sentinel_nickname,
    @now,
    @sentinel_email,
    NULL,
    'MEMBER',
    'EMAIL'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = @dev_sentinel_id);

UPDATE users
   SET email = CONCAT('tmp_dev_user_', id, '@example.invalid'),
       nickname = CONCAT('u', LPAD(MOD(id, 10000000), 7, '0')),
       password = NULL,
       profile_image_url = NULL,
       adult_birth_date = NULL,
       adult_verified = 0,
       adult_verified_at = NULL,
       adult_verify_expires_at = NULL,
       adult_verify_method = NULL,
       email_subscribed = 0,
       email_verified = 1,
       last_login_at = NULL,
       dormant = 0,
       dormant_at = NULL,
       suspend_reason = NULL,
       description = NULL,
       producer_id = NULL,
       privacy_agreed_at = NULL,
       privacy_agreed_version = NULL,
       terms_agreed_at = NULL,
       terms_agreed_version = NULL,
       nickname_changed_at = NULL,
       password_changed_at = NULL,
       profile_image_changed_at = NULL,
       must_change_password = 0,
       signup_method = 'EMAIL';

UPDATE users
   SET email = @sentinel_email,
       nickname = @sentinel_nickname,
       password = NULL,
       role = 'MEMBER',
       is_active = 0,
       email_verified = 1,
       profile_image_url = NULL,
       adult_birth_date = NULL,
       adult_verified = 0,
       adult_verified_at = NULL,
       adult_verify_expires_at = NULL,
       adult_verify_method = NULL,
       email_subscribed = 0,
       dormant = 0,
       dormant_at = NULL,
       description = NULL,
       current_level = 1,
       maturing_power = 0,
       nickname_fixed = 0,
       signup_method = 'EMAIL'
 WHERE id = @dev_sentinel_id;

UPDATE posts SET author_id = @dev_sentinel_id;
UPDATE review SET user_id = @dev_sentinel_id;
UPDATE post_comments SET author_id = @dev_sentinel_id;
UPDATE post_comments SET mentioned_user_id = NULL;
UPDATE community_comment SET user_id = @dev_sentinel_id;
UPDATE series SET author_id = @dev_sentinel_id;
UPDATE post_images SET uploaded_by_id = @dev_sentinel_id;
UPDATE post_videos SET uploaded_by_id = @dev_sentinel_id;
UPDATE price_report_images SET uploaded_by_id = @dev_sentinel_id;

UPDATE banners SET created_by_id = @dev_sentinel_id;
UPDATE banner_images SET uploaded_by_id = @dev_sentinel_id;
UPDATE notice SET author_id = @dev_sentinel_id;
UPDATE notice_image SET uploaded_by_id = @dev_sentinel_id;
UPDATE popups SET created_by_id = @dev_sentinel_id;
UPDATE popup_images SET uploaded_by_id = @dev_sentinel_id;
UPDATE calendar_events SET created_by_id = @dev_sentinel_id;

UPDATE legal_documents SET author_id = NULL;
UPDATE spirit SET registered_by_id = NULL;
UPDATE stores SET created_by_id = NULL, approved_by_id = NULL;
UPDATE price_reports SET reporter_id = NULL, approved_by_id = NULL;

DELETE FROM message_items;
DELETE FROM messages;
DELETE FROM notifications;
DELETE FROM email_send_recipients;
DELETE FROM email_send_logs;
DELETE FROM inquiry;
DELETE FROM feedback_comment;
DELETE FROM feedback;
DELETE FROM content_draft;
DELETE FROM user_bottle_image;
DELETE FROM user_bottle;
DELETE FROM byob_comments;
DELETE FROM byob_participants;
DELETE FROM byob_host_bottles;
DELETE FROM byobs;
DELETE FROM post_likes;
DELETE FROM post_scraps;
DELETE FROM post_reports;
DELETE FROM price_report_reports;
DELETE FROM poll_votes;
DELETE FROM comment_like;
DELETE FROM comment_emoji_reactions;
DELETE FROM notice_recommend;
DELETE FROM report;
DELETE FROM attendance_logs;
DELETE FROM score_history;
DELETE FROM wishlist;
DELETE FROM price_alerts;
DELETE FROM user_blocks;
DELETE FROM spirit_variant_review_request;
DELETE FROM spirit_register_request;
DELETE FROM producer_register_request;
DELETE FROM user_social_account;
DELETE FROM user_board_permissions;
DELETE FROM user_menu_permissions;
DELETE FROM admin_logs;

UPDATE posts SET like_count = 0, report_count = 0;
UPDATE post_comments SET report_count = 0;
UPDATE community_comment SET like_count = 0, report_count = 0;
UPDATE review SET report_count = 0;
UPDATE price_reports SET report_count = 0;
UPDATE poll_options SET vote_count = 0;

DELETE FROM users
 WHERE id <> @dev_sentinel_id;

UPDATE crawler_cookies
   SET nid_aut = NULL,
       nid_ses = NULL;
SQL

log "Dumping sanitized temporary database"
dump_db "$ADMIN_CNF" "$TMP_DB" | gzip > "$SANITIZED_DUMP"

if [ "$SKIP_TARGET_BACKUP" != "true" ]; then
    log "Backing up current target database: $TARGET_DB"
    if mysql_admin --execute "USE \`$TARGET_DB\`" >/dev/null 2>&1; then
        dump_db "$ADMIN_CNF" "$TARGET_DB" | gzip > "$TARGET_BACKUP"
        log "Target backup saved: $TARGET_BACKUP"
    else
        warn "Target database does not exist, backup skipped: $TARGET_DB"
    fi
else
    warn "Target backup skipped by SKIP_TARGET_BACKUP=true"
fi

log "Replacing target database: $TARGET_DB"
mysql_admin --execute "DROP DATABASE IF EXISTS \`$TARGET_DB\`; CREATE DATABASE \`$TARGET_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
gunzip -c "$SANITIZED_DUMP" | mysql_admin "$TARGET_DB"

log "Dropping temporary database: $TMP_DB"
mysql_admin --execute "DROP DATABASE IF EXISTS \`$TMP_DB\`;"

log "Applying retention policy: ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name "${TARGET_DB}_*_before_refresh.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete

log "Refresh complete: $SOURCE_DB -> $TARGET_DB"
log "Production account data was removed. Public content authors now point to withdrawn@caskbycask.system."
log "Restart the API so AdminDataInitializer can create the SUPER_ADMIN from ADMIN_EMAIL / ADMIN_PASSWORD."
