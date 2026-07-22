#!/usr/bin/env bash
# 최신 로컬 DB 덤프와 /app/upload를 private OCI Object Storage로 복제한다.
# 버킷·prefix·로컬 원본을 이중 확인하며, 완료 manifest가 마지막 commit marker다.
set -euo pipefail

ENV_FILE="${BACKUP_ENV_FILE:-/app/env/backup.env}"

log() { printf '[offsite-backup] %s %s\n' "$(date '+%F %T')" "$*"; }
fail() { printf '[offsite-backup] %s ERROR: %s\n' "$(date '+%F %T')" "$*" >&2; exit 1; }

supports_posix_permissions() {
    case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) return 1 ;; *) return 0 ;; esac
}

json_escape() {
    local value="$1"
    value=${value//\\/\\\\}
    value=${value//\"/\\\"}
    value=${value//$'\n'/\\n}
    value=${value//$'\r'/\\r}
    printf '%s' "$value"
}

validate_prefix() {
    local prefix="$1" segment
    [ -n "$prefix" ] && [ "${#prefix}" -le 256 ] || return 1
    [[ "$prefix" != /* && "$prefix" != */ && "$prefix" != *//* ]] || return 1
    [[ "$prefix" =~ ^[A-Za-z0-9._/-]+$ ]] || return 1
    IFS='/' read -r -a segments <<< "$prefix"
    for segment in "${segments[@]}"; do
        [ -n "$segment" ] && [ "$segment" != . ] && [ "$segment" != .. ] || return 1
    done
}

validate_oci_target() {
    local host namespace suffix_old suffix_new
    [[ "$OCI_BACKUP_REGION" =~ ^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$ ]] || \
        fail "OCI_BACKUP_REGION 형식이 올바르지 않습니다."
    [[ "$OCI_BACKUP_BUCKET" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$ ]] || \
        fail "OCI_BACKUP_BUCKET 형식이 올바르지 않습니다."
    [[ "$OCI_BACKUP_BUCKET" != *..* ]] || fail "OCI_BACKUP_BUCKET에 '..'를 사용할 수 없습니다."
    validate_prefix "$PREFIX" || fail "OCI_BACKUP_PREFIX 형식이 올바르지 않습니다."

    [[ "$OCI_BACKUP_ENDPOINT" == https://* ]] || fail "OCI endpoint는 HTTPS여야 합니다."
    host=${OCI_BACKUP_ENDPOINT#https://}
    [[ "$host" =~ ^[A-Za-z0-9.-]+$ ]] || \
        fail "OCI endpoint에는 host 이외의 path, port, query를 사용할 수 없습니다."
    suffix_old=".compat.objectstorage.${OCI_BACKUP_REGION}.oraclecloud.com"
    suffix_new=".compat.objectstorage.${OCI_BACKUP_REGION}.oci.customer-oci.com"
    if [[ "$host" == *"$suffix_old" ]]; then
        namespace=${host%"$suffix_old"}
    elif [[ "$host" == *"$suffix_new" ]]; then
        namespace=${host%"$suffix_new"}
    else
        fail "OCI Console의 현재 region S3 호환 endpoint를 사용하세요."
    fi
    [[ "$namespace" =~ ^[A-Za-z0-9][A-Za-z0-9-]{0,62}$ ]] || \
        fail "OCI endpoint namespace 형식이 올바르지 않습니다."
}

[ -f "$ENV_FILE" ] || fail "환경 파일이 없습니다: $ENV_FILE"
if supports_posix_permissions && [ -n "$(find "$ENV_FILE" -maxdepth 0 -perm /077 -print)" ]; then
    fail "$ENV_FILE 권한을 600으로 설정하세요."
fi
# shellcheck disable=SC1090
. "$ENV_FILE"

: "${OCI_BACKUP_ACCESS_KEY_ID:?OCI_BACKUP_ACCESS_KEY_ID is required}"
: "${OCI_BACKUP_SECRET_ACCESS_KEY:?OCI_BACKUP_SECRET_ACCESS_KEY is required}"
: "${OCI_BACKUP_ENDPOINT:?OCI_BACKUP_ENDPOINT is required}"
: "${OCI_BACKUP_REGION:?OCI_BACKUP_REGION is required}"
: "${OCI_BACKUP_BUCKET:?OCI_BACKUP_BUCKET is required}"

PREFIX="${OCI_BACKUP_PREFIX:-production}"
validate_oci_target
[ "${OCI_BACKUP_VERSIONING_CONFIRMED:-false}" = true ] || \
    fail "OCI Console에서 private/versioning/lifecycle을 확인한 뒤 OCI_BACKUP_VERSIONING_CONFIRMED=true로 설정하세요."
EXPECTED_TARGET_CONFIRMATION="${OCI_BACKUP_BUCKET}/${PREFIX}"
[ "${OCI_BACKUP_TARGET_CONFIRMATION:-}" = "$EXPECTED_TARGET_CONFIRMATION" ] || \
    fail "OCI_BACKUP_TARGET_CONFIRMATION을 '$EXPECTED_TARGET_CONFIRMATION'으로 정확히 설정하세요."
[ "${OFFSITE_SYNC_DELETE_ENABLED:-false}" != true ] || \
    fail "이번 릴리스는 원격 삭제 동기화를 지원하지 않습니다. OFFSITE_SYNC_DELETE_ENABLED를 제거하거나 false로 두세요."
SYNC_TARGET="s3://$OCI_BACKUP_BUCKET/$PREFIX/uploads/current/"

command -v aws >/dev/null 2>&1 || fail "검증된 AWS CLI가 필요합니다."
command -v flock >/dev/null 2>&1 || fail "flock 명령이 필요합니다(util-linux)."
command -v realpath >/dev/null 2>&1 || fail "realpath 명령이 필요합니다(coreutils)."
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum 명령이 필요합니다."
command -v stat >/dev/null 2>&1 || fail "stat 명령이 필요합니다(coreutils)."

RUNTIME_DIR="${BACKUP_RUNTIME_DIR:-/run/lock}"
[ -d "$RUNTIME_DIR" ] && [ -w "$RUNTIME_DIR" ] || \
    fail "휘발성 런타임 디렉터리에 쓸 수 없습니다: $RUNTIME_DIR"
LOCK_FILE="${BACKUP_LOCK_FILE:-$RUNTIME_DIR/caskbycask-backup.lock}"
exec 9>"$LOCK_FILE"
flock -n 9 || fail "다른 백업 작업이 실행 중입니다."

BACKUP_DIR=$(realpath -e "${LOCAL_DB_BACKUP_DIR:-/app/db_backup}") || \
    fail "로컬 DB 백업 디렉터리를 찾을 수 없습니다."
UPLOAD_DIR=$(realpath -e "${UPLOAD_PATH:-/app/upload}") || \
    fail "업로드 디렉터리를 찾을 수 없습니다."
[ -d "$BACKUP_DIR" ] && [ -d "$UPLOAD_DIR" ] || fail "백업 원본은 디렉터리여야 합니다."
[ "${OFFSITE_DB_SOURCE_CONFIRMED:-}" = "$BACKUP_DIR" ] || \
    fail "OFFSITE_DB_SOURCE_CONFIRMED를 '$BACKUP_DIR'으로 정확히 설정하세요."
[ "${OFFSITE_UPLOAD_SOURCE_CONFIRMED:-}" = "$UPLOAD_DIR" ] || \
    fail "OFFSITE_UPLOAD_SOURCE_CONFIRMED를 '$UPLOAD_DIR'으로 정확히 설정하세요."
case "$UPLOAD_DIR" in
    /|/app|/app/env|/home|/home/*/.ssh) fail "위험한 UPLOAD_PATH는 사용할 수 없습니다: $UPLOAD_DIR" ;;
esac

LOCAL_MARKER="$UPLOAD_DIR/.caskbycask-upload-root"
[ -f "$LOCAL_MARKER" ] && [ ! -L "$LOCAL_MARKER" ] || \
    fail "업로드 원본 marker가 없습니다: $LOCAL_MARKER"
[ "$(cat "$LOCAL_MARKER")" = 'caskbycask-upload-root-v1' ] || \
    fail "업로드 원본 marker 내용이 올바르지 않습니다."

MAX_AGE_HOURS="${OFFSITE_MAX_DB_AGE_HOURS:-26}"
[[ "$MAX_AGE_HOURS" =~ ^[0-9]+$ ]] && [ "$MAX_AGE_HOURS" -gt 0 ] || \
    fail "OFFSITE_MAX_DB_AGE_HOURS는 양의 정수여야 합니다."

LATEST_DB=""
for candidate in "$BACKUP_DIR"/*.sql.gz; do
    [ -f "$candidate" ] && [ ! -L "$candidate" ] || continue
    candidate_real=$(realpath -e "$candidate")
    [[ "$candidate_real" == "$BACKUP_DIR/"* ]] || continue
    if [ -z "$LATEST_DB" ] || [ "$candidate_real" -nt "$LATEST_DB" ]; then
        LATEST_DB="$candidate_real"
    fi
done
[ -n "$LATEST_DB" ] || fail "업로드할 로컬 DB 백업이 없습니다."
gzip -t "$LATEST_DB" || fail "로컬 DB 백업 gzip 무결성 검사 실패: $LATEST_DB"
FILE_AGE_SECONDS=$(( $(date +%s) - $(stat -c %Y "$LATEST_DB") ))
[ "$FILE_AGE_SECONDS" -ge 0 ] && [ "$FILE_AGE_SECONDS" -le $((MAX_AGE_HOURS * 3600)) ] || \
    fail "최신 DB 백업이 미래 시각이거나 ${MAX_AGE_HOURS}시간보다 오래됐습니다: $LATEST_DB"

umask 077
TMP_DIR=$(mktemp -d "$RUNTIME_DIR/caskbycask-offsite.XXXXXX")
AWS_CONFIG="$TMP_DIR/aws-config"
CURL_CONFIG=""

cleanup() {
    local status=$?
    if [ "$status" -eq 0 ]; then
        notify good "$(hostname) DB·uploads 외부 백업 완료"
    else
        notify danger "$(hostname) DB·uploads 외부 백업 실패 - 로그 확인 필요"
    fi
    rm -rf -- "$TMP_DIR"
    trap - EXIT
    exit "$status"
}

notify() {
    local color="$1" message="$2" escaped_url payload
    [ -n "${BACKUP_SLACK_WEBHOOK_URL:-}" ] || return 0
    escaped_url=${BACKUP_SLACK_WEBHOOK_URL//\\/\\\\}
    escaped_url=${escaped_url//\"/\\\"}
    payload="{\"attachments\":[{\"color\":\"$(json_escape "$color")\",\"title\":\"Offsite Backup\",\"text\":\"$(json_escape "$message")\"}]}"
    CURL_CONFIG="$TMP_DIR/curl-config"
    printf 'url = "%s"\n' "$escaped_url" > "$CURL_CONFIG"
    chmod 600 "$CURL_CONFIG"
    curl --config "$CURL_CONFIG" -fsS -X POST -H 'Content-Type: application/json' \
        --connect-timeout 5 --max-time 10 --data "$payload" >/dev/null 2>&1 || true
    rm -f -- "$CURL_CONFIG"
    CURL_CONFIG=""
}

trap cleanup EXIT

cat > "$AWS_CONFIG" <<EOF
[default]
region = ${OCI_BACKUP_REGION}
s3 =
    addressing_style = path
    payload_signing_enabled = false
    multipart_threshold = 512MB
    multipart_chunksize = 512MB
EOF
chmod 600 "$AWS_CONFIG"

AWS_ARGS=(--endpoint-url "$OCI_BACKUP_ENDPOINT" --region "$OCI_BACKUP_REGION")
aws_cli() {
    AWS_ACCESS_KEY_ID="$OCI_BACKUP_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$OCI_BACKUP_SECRET_ACCESS_KEY" \
    AWS_DEFAULT_REGION="$OCI_BACKUP_REGION" \
    AWS_CONFIG_FILE="$AWS_CONFIG" \
    AWS_SHARED_CREDENTIALS_FILE=/dev/null \
    AWS_EC2_METADATA_DISABLED=true \
    AWS_REQUEST_CHECKSUM_CALCULATION=when_required \
    AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
    AWS_PAGER="" \
        aws "$@" "${AWS_ARGS[@]}"
}

log "AWS CLI: $(aws --version 2>&1)"
aws_cli s3api head-bucket --bucket "$OCI_BACKUP_BUCKET" >/dev/null

SENTINEL_KEY="$PREFIX/.caskbycask-backup-target"
SENTINEL_SIZE=$(aws_cli s3api head-object --bucket "$OCI_BACKUP_BUCKET" --key "$SENTINEL_KEY" \
    --query ContentLength --output text)
[[ "$SENTINEL_SIZE" =~ ^[0-9]+$ ]] && [ "$SENTINEL_SIZE" -gt 0 ] \
    && [ "$SENTINEL_SIZE" -le 4096 ] || fail "원격 backup target sentinel 크기가 1~4096 byte 범위를 벗어났습니다."
SENTINEL_FILE="$TMP_DIR/remote-target-sentinel"
aws_cli s3 cp "s3://$OCI_BACKUP_BUCKET/$SENTINEL_KEY" "$SENTINEL_FILE" --only-show-errors
[ "$(stat -c %s "$SENTINEL_FILE")" = "$SENTINEL_SIZE" ] || \
    fail "원격 backup target sentinel 크기가 조회 후 변경됐습니다."
EXPECTED_SENTINEL=$(printf 'caskbycask-offsite-backup-v1\nbucket=%s\nprefix=%s' \
    "$OCI_BACKUP_BUCKET" "$PREFIX")
REMOTE_SENTINEL=$(cat "$SENTINEL_FILE")
[ "$REMOTE_SENTINEL" = "$EXPECTED_SENTINEL" ] || \
    fail "원격 backup target sentinel이 없거나 설정과 일치하지 않습니다."

RUN_ID=$(date -u +%Y%m%dT%H%M%SZ)-$$
DB_NAME=$(basename "$LATEST_DB")
[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+_[0-9]{8}_[0-9]{6}\.sql\.gz$ ]] || \
    fail "로컬 DB 백업 파일명이 표준 형식이 아닙니다: $DB_NAME"
DB_SHA=$(sha256sum "$LATEST_DB" | cut -d' ' -f1)
DB_SIZE=$(stat -c %s "$LATEST_DB")
printf '%s  %s\n' "$DB_SHA" "$DB_NAME" > "$TMP_DIR/$DB_NAME.sha256"

log "DB 외부 업로드: $DB_NAME"
aws_cli s3 cp "$LATEST_DB" "s3://$OCI_BACKUP_BUCKET/$PREFIX/database/$DB_NAME" \
    --only-show-errors
aws_cli s3 cp "$TMP_DIR/$DB_NAME.sha256" \
    "s3://$OCI_BACKUP_BUCKET/$PREFIX/database/$DB_NAME.sha256" --only-show-errors

UPLOAD_FILE_COUNT=$(find "$UPLOAD_DIR" -type f ! -path "$LOCAL_MARKER" -printf x | wc -c)
SYNC_ARGS=(s3 sync "$UPLOAD_DIR/" "$SYNC_TARGET" --no-follow-symlinks \
    --exclude '.caskbycask-upload-root' --exclude '.caskbycask-generation')
GENERATION_FILE="$TMP_DIR/upload-generation.env"
printf 'status=in-progress\nrun_id=%s\n' "$RUN_ID" > "$GENERATION_FILE"
aws_cli s3 cp "$GENERATION_FILE" "$SYNC_TARGET.caskbycask-generation" --only-show-errors
log "uploads 추가·갱신 동기화: 파일 ${UPLOAD_FILE_COUNT}개 (원격 삭제 미지원)"
aws_cli "${SYNC_ARGS[@]}" --only-show-errors
printf 'status=complete\nrun_id=%s\n' "$RUN_ID" > "$GENERATION_FILE"
aws_cli s3 cp "$GENERATION_FILE" "$SYNC_TARGET.caskbycask-generation" --only-show-errors

COMPLETED_EPOCH=$(date -u +%s)
COMPLETED_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)
MANIFEST_NAME="backup-${RUN_ID}.env"
MANIFEST="$TMP_DIR/$MANIFEST_NAME"
cat > "$MANIFEST" <<EOF
format=caskbycask-offsite-v1
run_id=${RUN_ID}
completed_at_epoch=${COMPLETED_EPOCH}
completed_at_utc=${COMPLETED_UTC}
database_key=${PREFIX}/database/${DB_NAME}
database_sha256=${DB_SHA}
database_size_bytes=${DB_SIZE}
uploads_prefix=${PREFIX}/uploads/current/
uploads_generation=${RUN_ID}
upload_file_count=${UPLOAD_FILE_COUNT}
EOF
aws_cli s3 cp "$MANIFEST" \
    "s3://$OCI_BACKUP_BUCKET/$PREFIX/manifests/$MANIFEST_NAME" --only-show-errors
log "외부 백업 완료: s3://$OCI_BACKUP_BUCKET/$PREFIX (manifest: $MANIFEST_NAME)"
