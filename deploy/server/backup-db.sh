#!/usr/bin/env bash
# CaskByCask MariaDB 로컬 백업: 원자적 gzip 덤프, 무결성 검사, 짧은 보관.
set -euo pipefail

ENV_FILE="${API_ENV_FILE:-/app/env/api.env}"

log() { printf '[backup] %s %s\n' "$(date '+%F %T')" "$*"; }
fail() { printf '[backup] %s ERROR: %s\n' "$(date '+%F %T')" "$*" >&2; exit 1; }

supports_posix_permissions() {
    case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) return 1 ;; *) return 0 ;; esac
}

contains_newline() {
    case "$1" in
        *$'\n'*|*$'\r'*) return 0 ;;
        *) return 1 ;;
    esac
}

escape_option_value() {
    local value="$1"
    value=${value//\\/\\\\}
    value=${value//\"/\\\"}
    printf '%s' "$value"
}

json_escape() {
    local value="$1"
    value=${value//\\/\\\\}
    value=${value//\"/\\\"}
    value=${value//$'\n'/\\n}
    value=${value//$'\r'/\\r}
    printf '%s' "$value"
}

[ -f "$ENV_FILE" ] || fail "환경 파일이 없습니다: $ENV_FILE"
if supports_posix_permissions && [ -n "$(find "$ENV_FILE" -maxdepth 0 -perm /077 -print)" ]; then
    fail "$ENV_FILE 권한을 600으로 설정하세요."
fi

# 필요한 값만 현재 셸 변수로 읽고 api.env 전체를 하위 프로세스 환경으로 export하지 않는다.
# shellcheck disable=SC1090
. "$ENV_FILE"

DB_NAME="${BACKUP_DB_NAME:-caskbycask_prod}"
DB_HOST="${DB_HOST:-127.0.0.1}"
BACKUP_DIR="${LOCAL_DB_BACKUP_DIR:-/app/db_backup}"
RETENTION_DAYS="${LOCAL_BACKUP_RETENTION_DAYS:-3}"
: "${DB_USERNAME:?DB_USERNAME is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"

[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] || fail "BACKUP_DB_NAME은 영문, 숫자, 밑줄만 사용할 수 있습니다."
[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && [ "$RETENTION_DAYS" -le 3650 ] || \
    fail "LOCAL_BACKUP_RETENTION_DAYS는 0~3650 정수여야 합니다."
contains_newline "$DB_HOST" && fail "DB_HOST에 개행을 사용할 수 없습니다."
contains_newline "$DB_USERNAME" && fail "DB_USERNAME에 개행을 사용할 수 없습니다."
contains_newline "$DB_PASSWORD" && fail "DB_PASSWORD에 개행을 사용할 수 없습니다."
command -v flock >/dev/null 2>&1 || fail "flock 명령이 필요합니다(util-linux)."
command -v mariadb-dump >/dev/null 2>&1 || fail "mariadb-dump 명령이 필요합니다."
command -v gzip >/dev/null 2>&1 || fail "gzip 명령이 필요합니다."

RUNTIME_DIR="${BACKUP_RUNTIME_DIR:-/run/lock}"
[ -d "$RUNTIME_DIR" ] && [ -w "$RUNTIME_DIR" ] || \
    fail "휘발성 런타임 디렉터리에 쓸 수 없습니다: $RUNTIME_DIR"

umask 077
mkdir -p "$BACKUP_DIR"
LOCK_FILE="${BACKUP_LOCK_FILE:-$RUNTIME_DIR/caskbycask-backup.lock}"
exec 9>"$LOCK_FILE"
flock -n 9 || fail "다른 백업 작업이 실행 중입니다."

NOW=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/${DB_NAME}_${NOW}.sql.gz"
PARTIAL_FILE="$FILE.part"
CLIENT_CNF=$(mktemp "$RUNTIME_DIR/caskbycask-mariadb-client.XXXXXX")
CURL_CONFIG=""

cleanup() {
    rm -f -- "$CLIENT_CNF"
    [ -z "$CURL_CONFIG" ] || rm -f -- "$CURL_CONFIG"
    rm -f -- "$PARTIAL_FILE"
}
trap cleanup EXIT

printf '[client]\nhost="%s"\nuser="%s"\npassword="%s"\n' \
    "$(escape_option_value "$DB_HOST")" \
    "$(escape_option_value "$DB_USERNAME")" \
    "$(escape_option_value "$DB_PASSWORD")" > "$CLIENT_CNF"
chmod 600 "$CLIENT_CNF"

notify() {
    local color="$1" message="$2" escaped_url payload
    [ -n "${SLACK_WEBHOOK_URL:-}" ] || return 0
    escaped_url=$(escape_option_value "$SLACK_WEBHOOK_URL")
    payload="{\"attachments\":[{\"color\":\"$(json_escape "$color")\",\"title\":\"DB Backup\",\"text\":\"$(json_escape "$message")\"}]}"
    CURL_CONFIG=$(mktemp "$RUNTIME_DIR/caskbycask-curl.XXXXXX")
    printf 'url = "%s"\n' "$escaped_url" > "$CURL_CONFIG"
    chmod 600 "$CURL_CONFIG"
    curl --config "$CURL_CONFIG" -fsS -X POST -H 'Content-Type: application/json' \
        --connect-timeout 5 --max-time 10 --data "$payload" >/dev/null 2>&1 || true
    rm -f -- "$CURL_CONFIG"
    CURL_CONFIG=""
}

log "덤프 시작: $DB_NAME"
if ! mariadb-dump --defaults-extra-file="$CLIENT_CNF" \
        --single-transaction --quick --routines --triggers --skip-lock-tables \
        --default-character-set=utf8mb4 --hex-blob \
        "$DB_NAME" | gzip > "$PARTIAL_FILE"; then
    notify danger "$DB_NAME 백업 실패 - 서버 로그 확인 필요"
    fail "mariadb-dump 실패"
fi

if ! gzip -t "$PARTIAL_FILE"; then
    notify danger "$DB_NAME 백업 무결성 검사 실패 - 서버 로그 확인 필요"
    fail "백업 gzip 무결성 검사 실패"
fi
chmod 600 "$PARTIAL_FILE"
mv -- "$PARTIAL_FILE" "$FILE"

SIZE=$(du -h "$FILE" | cut -f1)
log "백업 완료: $(basename "$FILE") ($SIZE)"
find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DB_NAME}_*.sql.gz" \
    -mtime +"$RETENTION_DAYS" -delete
log "보관 정책 적용(${RETENTION_DAYS}일) 완료"
notify good "$DB_NAME 백업 완료 ($SIZE)"
