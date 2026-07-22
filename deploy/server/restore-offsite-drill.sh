#!/usr/bin/env bash
# 최신 완료 manifest의 외부 백업을 격리된 disposable 호스트의 제한 DB 계정으로 복원한다.
# 운영 서버에서는 host marker와 machine-id 확인이 실패하므로 실행되지 않는다.
set -euo pipefail

ENV_FILE="${BACKUP_ENV_FILE:-/app/env/backup.env}"
START_EPOCH=$(date +%s)

log() { printf '[restore-drill] %s %s\n' "$(date '+%F %T')" "$*"; }
fail() { printf '[restore-drill] %s ERROR: %s\n' "$(date '+%F %T')" "$*" >&2; exit 1; }

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

manifest_value() {
    local key="$1" count
    count=$(grep -c "^${key}=" "$MANIFEST_FILE" || true)
    [ "$count" -eq 1 ] || fail "manifest의 ${key} 항목은 정확히 하나여야 합니다."
    sed -n "s/^${key}=//p" "$MANIFEST_FILE"
}

[ "$EUID" -ne 0 ] || fail "root로 실행하지 마세요. 격리 호스트의 제한 계정을 사용해야 합니다."
[ -f "$ENV_FILE" ] || fail "환경 파일이 없습니다: $ENV_FILE"
if supports_posix_permissions && [ -n "$(find "$ENV_FILE" -maxdepth 0 -perm /077 -print)" ]; then
    fail "$ENV_FILE 권한을 600으로 설정하세요."
fi
# shellcheck disable=SC1090
. "$ENV_FILE"

[ "${RESTORE_DRILL_ISOLATION_CONFIRMED:-false}" = true ] || \
    fail "격리 호스트 확인 후 RESTORE_DRILL_ISOLATION_CONFIRMED=true로 설정하세요."
if supports_posix_permissions; then
    ISOLATION_MARKER=/etc/caskbycask/restore-drill-host
    MACHINE_ID_FILE=/etc/machine-id
else
    # Windows Git Bash 자동 테스트 전용 경로. Linux 운영에서는 이 변수를 무시한다.
    : "${RESTORE_DRILL_TEST_MARKER_FILE:?RESTORE_DRILL_TEST_MARKER_FILE is required on non-Linux test hosts}"
    : "${RESTORE_DRILL_TEST_MACHINE_ID_FILE:?RESTORE_DRILL_TEST_MACHINE_ID_FILE is required on non-Linux test hosts}"
    ISOLATION_MARKER="$RESTORE_DRILL_TEST_MARKER_FILE"
    MACHINE_ID_FILE="$RESTORE_DRILL_TEST_MACHINE_ID_FILE"
fi
[ -f "$ISOLATION_MARKER" ] && [ ! -L "$ISOLATION_MARKER" ] || \
    fail "격리 호스트 marker가 없습니다: $ISOLATION_MARKER"
if supports_posix_permissions && [ "$(stat -c %u "$ISOLATION_MARKER")" -ne 0 ]; then
    fail "격리 호스트 marker는 root 소유여야 합니다."
fi
if supports_posix_permissions && [ -n "$(find "$ISOLATION_MARKER" -maxdepth 0 -perm /022 -print)" ]; then
    fail "격리 호스트 marker는 group/other 쓰기 권한이 없어야 합니다."
fi
[ "$(cat "$ISOLATION_MARKER")" = 'caskbycask-isolated-restore-host-v1' ] || \
    fail "격리 호스트 marker 내용이 올바르지 않습니다."
MACHINE_ID=$(tr -d '[:space:]' < "$MACHINE_ID_FILE")
[ -n "$MACHINE_ID" ] && [ "${RESTORE_DRILL_EXPECTED_MACHINE_ID:-}" = "$MACHINE_ID" ] || \
    fail "RESTORE_DRILL_EXPECTED_MACHINE_ID가 현재 격리 호스트와 일치하지 않습니다."
[ "${RESTORE_DRILL_TARGET_CAPACITY_CONFIRMED:-false}" = true ] || \
    fail "격리 DB 용량을 확인한 뒤 RESTORE_DRILL_TARGET_CAPACITY_CONFIRMED=true로 설정하세요."

: "${OCI_BACKUP_ACCESS_KEY_ID:?OCI_BACKUP_ACCESS_KEY_ID is required}"
: "${OCI_BACKUP_SECRET_ACCESS_KEY:?OCI_BACKUP_SECRET_ACCESS_KEY is required}"
: "${OCI_BACKUP_ENDPOINT:?OCI_BACKUP_ENDPOINT is required}"
: "${OCI_BACKUP_REGION:?OCI_BACKUP_REGION is required}"
: "${OCI_BACKUP_BUCKET:?OCI_BACKUP_BUCKET is required}"
: "${RESTORE_DRILL_DB_HOST:?RESTORE_DRILL_DB_HOST is required}"
: "${RESTORE_DRILL_DB_USERNAME:?RESTORE_DRILL_DB_USERNAME is required}"
: "${RESTORE_DRILL_DB_PASSWORD:?RESTORE_DRILL_DB_PASSWORD is required}"
: "${RESTORE_DRILL_DB_NAME:?RESTORE_DRILL_DB_NAME is required}"

PREFIX="${OCI_BACKUP_PREFIX:-production}"
validate_oci_target
[ "${OCI_BACKUP_TARGET_CONFIRMATION:-}" = "${OCI_BACKUP_BUCKET}/${PREFIX}" ] || \
    fail "OCI_BACKUP_TARGET_CONFIRMATION이 현재 복원 bucket/prefix와 일치하지 않습니다."
RESTORE_DRILL_DB_PORT="${RESTORE_DRILL_DB_PORT:-3306}"
[[ "$RESTORE_DRILL_DB_PORT" =~ ^[0-9]+$ ]] && \
    [ "$RESTORE_DRILL_DB_PORT" -ge 1 ] && [ "$RESTORE_DRILL_DB_PORT" -le 65535 ] || \
    fail "RESTORE_DRILL_DB_PORT는 1~65535 정수여야 합니다."
[[ "$RESTORE_DRILL_DB_NAME" =~ ^caskbycask_restore_drill_[A-Za-z0-9_]+$ ]] || \
    fail "복원 대상 DB 이름은 caskbycask_restore_drill_ 접두사로 시작해야 합니다."
[ "${RESTORE_DRILL_DB_USERNAME,,}" != root ] || fail "복원 import에 root 계정을 사용할 수 없습니다."
case "$RESTORE_DRILL_DB_HOST" in
    127.0.0.1|::1) ;;
    *) fail "복원 DB는 격리 호스트의 loopback 주소(127.0.0.1 또는 ::1)만 사용할 수 있습니다." ;;
esac
contains_newline "$RESTORE_DRILL_DB_HOST" && fail "RESTORE_DRILL_DB_HOST에 개행을 사용할 수 없습니다."
contains_newline "$RESTORE_DRILL_DB_USERNAME" && fail "RESTORE_DRILL_DB_USERNAME에 개행을 사용할 수 없습니다."
contains_newline "$RESTORE_DRILL_DB_PASSWORD" && fail "RESTORE_DRILL_DB_PASSWORD에 개행을 사용할 수 없습니다."
EXPECTED_DB_CONFIRMATION="${RESTORE_DRILL_DB_HOST}:${RESTORE_DRILL_DB_PORT}/${RESTORE_DRILL_DB_NAME}"
[ "${RESTORE_DRILL_DB_TARGET_CONFIRMATION:-}" = "$EXPECTED_DB_CONFIRMATION" ] || \
    fail "RESTORE_DRILL_DB_TARGET_CONFIRMATION을 '$EXPECTED_DB_CONFIRMATION'으로 정확히 설정하세요."

for command_name in aws flock gzip mariadb mariadb-check sha256sum timeout nice realpath stat df; do
    command -v "$command_name" >/dev/null 2>&1 || fail "$command_name 명령이 필요합니다."
done

RUNTIME_DIR="${BACKUP_RUNTIME_DIR:-/run/lock}"
[ -d "$RUNTIME_DIR" ] && [ -w "$RUNTIME_DIR" ] || \
    fail "휘발성 런타임 디렉터리에 쓸 수 없습니다: $RUNTIME_DIR"
LOCK_FILE="${BACKUP_LOCK_FILE:-$RUNTIME_DIR/caskbycask-backup.lock}"
exec 9>"$LOCK_FILE"
flock -n 9 || fail "다른 백업 또는 복원 작업이 실행 중입니다."

umask 077
WORK_ROOT_RAW="${RESTORE_DRILL_WORK_DIR:-/var/tmp/caskbycask-restore}"
[ "${RESTORE_DRILL_WORK_DIR_CONFIRMED:-}" = "$WORK_ROOT_RAW" ] || \
    fail "RESTORE_DRILL_WORK_DIR_CONFIRMED가 설정 경로와 일치하지 않습니다."
mkdir -p -m 700 "$WORK_ROOT_RAW"
WORK_ROOT=$(realpath -e "$WORK_ROOT_RAW") || fail "복원 작업 디렉터리를 확인할 수 없습니다."
[ -d "$WORK_ROOT" ] && [ ! -L "$WORK_ROOT_RAW" ] || fail "복원 작업 경로는 symlink가 아닌 디렉터리여야 합니다."
[ "${RESTORE_DRILL_WORK_DIR_CONFIRMED:-}" = "$WORK_ROOT" ] || \
    fail "RESTORE_DRILL_WORK_DIR_CONFIRMED를 '$WORK_ROOT'으로 정확히 설정하세요."
if supports_posix_permissions; then
    [ "$(stat -c %u "$WORK_ROOT")" -eq "$EUID" ] || fail "복원 작업 디렉터리는 실행 사용자 소유여야 합니다."
    [ -z "$(find "$WORK_ROOT" -maxdepth 0 -perm /077 -print)" ] || \
        fail "복원 작업 디렉터리 권한은 700이어야 합니다."
fi
SECRET_DIR=$(mktemp -d "$RUNTIME_DIR/caskbycask-restore-secret.XXXXXX")
WORK_DIR=$(mktemp -d "$WORK_ROOT/run.XXXXXX")
AWS_CONFIG="$SECRET_DIR/aws-config"
CLIENT_CNF="$SECRET_DIR/mariadb-client.cnf"
MANIFEST_FILE="$WORK_DIR/manifest.env"
cleanup() { rm -rf -- "$SECRET_DIR" "$WORK_DIR"; }
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

download_control_object() {
    local key="$1" destination="$2" max_bytes="$3" declared_size actual_size
    declared_size=$(aws_cli s3api head-object --bucket "$OCI_BACKUP_BUCKET" --key "$key" \
        --query ContentLength --output text)
    [[ "$declared_size" =~ ^[0-9]+$ ]] && [ "$declared_size" -gt 0 ] \
        && [ "$declared_size" -le "$max_bytes" ] || \
        fail "원격 제어 객체 크기가 1~${max_bytes} byte 범위를 벗어났습니다: $key"
    aws_cli s3 cp "s3://$OCI_BACKUP_BUCKET/$key" "$destination" --only-show-errors
    actual_size=$(stat -c %s "$destination")
    [ "$actual_size" = "$declared_size" ] || \
        fail "원격 제어 객체 크기가 조회 후 변경됐습니다: $key"
}

SENTINEL_KEY="$PREFIX/.caskbycask-backup-target"
SENTINEL_FILE="$WORK_DIR/remote-target-sentinel"
download_control_object "$SENTINEL_KEY" "$SENTINEL_FILE" 4096
EXPECTED_SENTINEL=$(printf 'caskbycask-offsite-backup-v1\nbucket=%s\nprefix=%s' \
    "$OCI_BACKUP_BUCKET" "$PREFIX")
REMOTE_SENTINEL=$(cat "$SENTINEL_FILE")
[ "$REMOTE_SENTINEL" = "$EXPECTED_SENTINEL" ] || \
    fail "원격 backup target sentinel이 설정과 일치하지 않습니다."

MANIFEST_KEYS=$(aws_cli s3api list-objects-v2 --bucket "$OCI_BACKUP_BUCKET" \
    --prefix "$PREFIX/manifests/" --query 'Contents[].Key' --output text)
MANIFEST_KEY=$(printf '%s\n' "$MANIFEST_KEYS" | tr '\t' '\n' \
    | awk -v prefix="$PREFIX/manifests/backup-" \
        'index($0, prefix) == 1 {
            name = substr($0, length(prefix) + 1)
            if (name ~ /^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z-[0-9]+\.env$/) print
        }' \
    | LC_ALL=C sort | tail -n 1)
[ -n "$MANIFEST_KEY" ] && [ "$MANIFEST_KEY" != None ] || \
    fail "완료 manifest가 없습니다."
log "최신 완료 manifest 다운로드: $MANIFEST_KEY"
download_control_object "$MANIFEST_KEY" "$MANIFEST_FILE" 65536

[ "$(manifest_value format)" = 'caskbycask-offsite-v1' ] || fail "지원하지 않는 manifest 형식입니다."
RUN_ID=$(manifest_value run_id)
COMPLETED_EPOCH=$(manifest_value completed_at_epoch)
DB_KEY=$(manifest_value database_key)
EXPECTED_SHA=$(manifest_value database_sha256)
EXPECTED_DB_SIZE=$(manifest_value database_size_bytes)
UPLOADS_PREFIX=$(manifest_value uploads_prefix)
UPLOADS_GENERATION=$(manifest_value uploads_generation)
[[ "$RUN_ID" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9]+$ ]] || fail "manifest run_id가 올바르지 않습니다."
[[ "$COMPLETED_EPOCH" =~ ^[0-9]+$ ]] || fail "manifest 완료 시각이 올바르지 않습니다."
[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{64}$ ]] || fail "manifest SHA-256이 올바르지 않습니다."
[[ "$EXPECTED_DB_SIZE" =~ ^[0-9]+$ ]] && [ "$EXPECTED_DB_SIZE" -gt 0 ] || \
    fail "manifest DB 크기가 올바르지 않습니다."
[[ "$DB_KEY" == "$PREFIX/database/"*.sql.gz ]] && \
    [[ "$DB_KEY" =~ ^[A-Za-z0-9._/-]+$ ]] && [[ "$DB_KEY" != *"/../"* ]] || \
    fail "manifest database_key가 허용 범위를 벗어났습니다."
[ "$UPLOADS_PREFIX" = "$PREFIX/uploads/current/" ] || \
    fail "manifest uploads_prefix가 허용 범위와 다릅니다."
[ "$UPLOADS_GENERATION" = "$RUN_ID" ] || fail "manifest uploads_generation이 run_id와 다릅니다."
EXPECTED_GENERATION=$(printf 'status=complete\nrun_id=%s' "$UPLOADS_GENERATION")
GENERATION_KEY="${UPLOADS_PREFIX}.caskbycask-generation"
GENERATION_FILE="$WORK_DIR/remote-upload-generation"
download_control_object "$GENERATION_KEY" "$GENERATION_FILE" 4096
REMOTE_GENERATION=$(cat "$GENERATION_FILE")
[ "$REMOTE_GENERATION" = "$EXPECTED_GENERATION" ] || \
    fail "uploads/current가 마지막 완료 generation 상태가 아닙니다."

MAX_BACKUP_AGE_HOURS="${RESTORE_DRILL_MAX_BACKUP_AGE_HOURS:-36}"
[[ "$MAX_BACKUP_AGE_HOURS" =~ ^[0-9]+$ ]] && [ "$MAX_BACKUP_AGE_HOURS" -gt 0 ] || \
    fail "RESTORE_DRILL_MAX_BACKUP_AGE_HOURS는 양의 정수여야 합니다."
NOW_EPOCH=$(date +%s)
BACKUP_AGE_SECONDS=$((NOW_EPOCH - COMPLETED_EPOCH))
[ "$BACKUP_AGE_SECONDS" -ge -300 ] && \
    [ "$BACKUP_AGE_SECONDS" -le $((MAX_BACKUP_AGE_HOURS * 3600)) ] || \
    fail "완료 manifest가 미래 시각이거나 ${MAX_BACKUP_AGE_HOURS}시간보다 오래됐습니다."

REMOTE_DB_SIZE=$(aws_cli s3api head-object --bucket "$OCI_BACKUP_BUCKET" --key "$DB_KEY" \
    --query ContentLength --output text)
[ "$REMOTE_DB_SIZE" = "$EXPECTED_DB_SIZE" ] || fail "manifest와 원격 DB 크기가 다릅니다."
MIN_FREE_MB="${RESTORE_DRILL_MIN_LOCAL_FREE_MB:-1024}"
[[ "$MIN_FREE_MB" =~ ^[0-9]+$ ]] || fail "RESTORE_DRILL_MIN_LOCAL_FREE_MB는 0 이상의 정수여야 합니다."
AVAILABLE_KB=$(df -Pk "$WORK_DIR" | awk 'NR == 2 { print $4 }')
REQUIRED_KB=$(( (EXPECTED_DB_SIZE + 1023) / 1024 + MIN_FREE_MB * 1024 ))
[ "$AVAILABLE_KB" -ge "$REQUIRED_KB" ] || \
    fail "격리 호스트 다운로드 공간이 부족합니다(필요 ${REQUIRED_KB}KB, 가용 ${AVAILABLE_KB}KB)."

DB_FILE="$WORK_DIR/$(basename "$DB_KEY")"
log "DB 백업 다운로드: $DB_KEY"
aws_cli s3 cp "s3://$OCI_BACKUP_BUCKET/$DB_KEY" "$DB_FILE" --only-show-errors
[ "$(stat -c %s "$DB_FILE")" = "$EXPECTED_DB_SIZE" ] || fail "다운로드 DB 크기가 다릅니다."
ACTUAL_SHA=$(sha256sum "$DB_FILE" | cut -d' ' -f1)
[ "$ACTUAL_SHA" = "$EXPECTED_SHA" ] || fail "DB SHA-256 검증에 실패했습니다."
gzip -t "$DB_FILE"

printf '[client]\nprotocol=tcp\nhost="%s"\nport=%s\nuser="%s"\npassword="%s"\nconnect-timeout=10\n' \
    "$(escape_option_value "$RESTORE_DRILL_DB_HOST")" "$RESTORE_DRILL_DB_PORT" \
    "$(escape_option_value "$RESTORE_DRILL_DB_USERNAME")" \
    "$(escape_option_value "$RESTORE_DRILL_DB_PASSWORD")" > "$CLIENT_CNF"
chmod 600 "$CLIENT_CNF"

GRANTS=$(mariadb --defaults-extra-file="$CLIENT_CNF" -N -e 'SHOW GRANTS FOR CURRENT_USER()')
TARGET_GRANT_COUNT=0
while IFS= read -r grant_line; do
    [[ "$grant_line" != *' WITH GRANT OPTION'* ]] || fail "복원 계정에 GRANT OPTION이 있으면 안 됩니다."
    case "$grant_line" in
        'GRANT USAGE ON *.* TO '*) ;;
        *" ON \`$RESTORE_DRILL_DB_NAME\`.* TO "*) TARGET_GRANT_COUNT=$((TARGET_GRANT_COUNT + 1)) ;;
        *) fail "복원 계정에 대상 DB 밖의 권한이 있습니다: $grant_line" ;;
    esac
done <<< "$GRANTS"
[ "$TARGET_GRANT_COUNT" -gt 0 ] || fail "복원 계정에 대상 DB 권한이 없습니다."
CURRENT_ROLE=$(mariadb --defaults-extra-file="$CLIENT_CNF" -N -e 'SELECT CURRENT_ROLE()')
[ -z "$CURRENT_ROLE" ] || [ "$CURRENT_ROLE" = NULL ] || fail "복원 계정에 활성 role이 있으면 안 됩니다."

TABLE_COUNT_BEFORE=$(mariadb --defaults-extra-file="$CLIENT_CNF" -N -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${RESTORE_DRILL_DB_NAME}'")
[ "$TABLE_COUNT_BEFORE" -eq 0 ] || fail "복원 대상 DB가 비어 있지 않습니다."

IMPORT_TIMEOUT="${RESTORE_DRILL_IMPORT_TIMEOUT_SECONDS:-7200}"
[[ "$IMPORT_TIMEOUT" =~ ^[0-9]+$ ]] && [ "$IMPORT_TIMEOUT" -gt 0 ] || \
    fail "RESTORE_DRILL_IMPORT_TIMEOUT_SECONDS는 양의 정수여야 합니다."
log "격리 DB 복원 시작: $RESTORE_DRILL_DB_NAME"
nice -n 10 gzip -dc "$DB_FILE" | timeout "$IMPORT_TIMEOUT" \
    nice -n 10 mariadb --defaults-extra-file="$CLIENT_CNF" "$RESTORE_DRILL_DB_NAME"

TABLE_COUNT=$(mariadb --defaults-extra-file="$CLIENT_CNF" -N -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${RESTORE_DRILL_DB_NAME}'")
[ "$TABLE_COUNT" -gt 0 ] || fail "격리 DB에 복원된 테이블이 없습니다."
mariadb-check --defaults-extra-file="$CLIENT_CNF" --check "$RESTORE_DRILL_DB_NAME" >/dev/null
log "DB 복원 검증 완료: ${TABLE_COUNT}개 테이블"

UPLOAD_SAMPLES=$(aws_cli s3api list-objects-v2 --bucket "$OCI_BACKUP_BUCKET" \
    --prefix "$UPLOADS_PREFIX" --max-items 100 \
    --query 'Contents[?Size > `0`].[Key,Size]' --output text)
UPLOAD_KEY=""
UPLOAD_SIZE=""
while IFS=$'\t' read -r candidate_key candidate_size; do
    [ "$candidate_key" != "${UPLOADS_PREFIX}.caskbycask-generation" ] || continue
    UPLOAD_KEY="$candidate_key"
    UPLOAD_SIZE="$candidate_size"
    break
done <<< "$UPLOAD_SAMPLES"
if [ -n "$UPLOAD_KEY" ] && [ "$UPLOAD_KEY" != None ]; then
    [[ "$UPLOAD_KEY" == "$UPLOADS_PREFIX"* ]] && [[ "$UPLOAD_SIZE" =~ ^[0-9]+$ ]] || \
        fail "업로드 표본 응답이 올바르지 않습니다."
    MAX_SAMPLE_MB="${RESTORE_DRILL_MAX_UPLOAD_SAMPLE_MB:-50}"
    [[ "$MAX_SAMPLE_MB" =~ ^[0-9]+$ ]] || fail "RESTORE_DRILL_MAX_UPLOAD_SAMPLE_MB는 정수여야 합니다."
    [ "$UPLOAD_SIZE" -le $((MAX_SAMPLE_MB * 1024 * 1024)) ] || \
        fail "업로드 표본이 ${MAX_SAMPLE_MB}MB 상한을 초과합니다: $UPLOAD_KEY"
    aws_cli s3 cp "s3://$OCI_BACKUP_BUCKET/$UPLOAD_KEY" "$WORK_DIR/upload-sample" \
        --only-show-errors
    [ "$(stat -c %s "$WORK_DIR/upload-sample")" = "$UPLOAD_SIZE" ] || \
        fail "업로드 표본 크기가 원격 메타데이터와 다릅니다."
    log "업로드 표본 복원 검증 완료: $UPLOAD_KEY"
elif [ "${RESTORE_DRILL_REQUIRE_UPLOADS:-true}" = true ]; then
    fail "원격 uploads/current에 0바이트가 아닌 객체가 없습니다."
else
    log "업로드 객체가 없어 표본 검증을 건너뜁니다."
fi

ELAPSED_SECONDS=$(( $(date +%s) - START_EPOCH ))
log "외부 백업 복원 훈련 성공: run=${RUN_ID}, elapsed=${ELAPSED_SECONDS}s (운영 DB 접속 없음)"
