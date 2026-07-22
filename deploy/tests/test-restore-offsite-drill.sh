#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ "${EUID:-0}" -eq 0 ]; then
  if [ "${CI:-false}" = true ]; then
    echo "restore drill integration test must not skip in CI" >&2
    exit 1
  fi
  echo "restore drill integration test skipped (requires a non-root runner)"
  exit 0
fi

TMP_DIR=$(mktemp -d)
IS_WINDOWS=false
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) IS_WINDOWS=true ;; esac
cleanup() {
  if [ "$IS_WINDOWS" = false ]; then
    sudo rm -f /etc/caskbycask/restore-drill-host
    sudo rmdir /etc/caskbycask 2>/dev/null || true
  fi
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT
mkdir -p "$TMP_DIR/bin"

printf '%s\n' 'CREATE TABLE restore_smoke_test (id BIGINT);' | gzip > "$TMP_DIR/database.sql.gz"
DB_SIZE=$(stat -c %s "$TMP_DIR/database.sql.gz")
DB_SHA=$(sha256sum "$TMP_DIR/database.sql.gz" | cut -d' ' -f1)
NOW=$(date +%s)
cat > "$TMP_DIR/latest-manifest.env" <<ENV
format=caskbycask-offsite-v1
run_id=20260722T030000Z-22
completed_at_epoch=$NOW
completed_at_utc=2026-07-22T03:00:00Z
database_key=production/database/caskbycask_prod_20260722_030000.sql.gz
database_sha256=$DB_SHA
database_size_bytes=$DB_SIZE
uploads_prefix=production/uploads/current/
uploads_generation=20260722T030000Z-22
upload_file_count=1
ENV

cat > "$TMP_DIR/bin/aws" <<'MOCK'
#!/usr/bin/env bash
printf '%s\t' "$@" >> "$AWS_LOG"
printf '\n' >> "$AWS_LOG"
if [ "${1:-}" = s3api ] && [ "${2:-}" = list-objects-v2 ]; then
  if [[ " $* " == *"/manifests/"* ]]; then
    printf 'production/manifests/backup-20260721T030000Z-1.env\tproduction/manifests/backup-20260722T030000Z-22.env\n'
  else
    printf 'production/uploads/current/sample.jpg\t4\n'
  fi
  exit 0
fi
if [ "${1:-}" = s3api ] && [ "${2:-}" = head-object ]; then
  case " $* " in
    *'.caskbycask-backup-target'*) printf '%s\n' "$SENTINEL_SIZE" ;;
    *'.caskbycask-generation'*) printf '%s\n' "$GENERATION_SIZE" ;;
    *'/manifests/'*)
      if [ "${MOCK_MANIFEST_OVERSIZE:-false}" = true ]; then printf '70000\n'; else printf '%s\n' "$MANIFEST_SIZE"; fi ;;
    *) printf '%s\n' "$DB_SIZE" ;;
  esac
  exit 0
fi
if [ "${1:-}" = s3 ] && [ "${2:-}" = cp ]; then
  case "${3:-}" in
    */.caskbycask-backup-target)
      printf 'caskbycask-offsite-backup-v1\nbucket=test-backup-bucket\nprefix=production\n' > "${4}" ;;
    */uploads/current/.caskbycask-generation)
      if [ "${MOCK_GENERATION_MISMATCH:-false}" = true ]; then
        printf 'status=in-progress\nrun_id=20260722T040000Z-23\n' > "${4}"
      else
        printf 'status=complete\nrun_id=20260722T030000Z-22\n' > "${4}"
      fi ;;
    */manifests/backup-20260722T030000Z-22.env) cp "$MANIFEST_FIXTURE" "${4}" ;;
    */database/*.sql.gz) cp "$DB_FIXTURE" "${4}" ;;
    */uploads/current/sample.jpg) printf '%s' data > "${4}" ;;
    *) exit 8 ;;
  esac
  exit 0
fi
exit 7
MOCK

cat > "$TMP_DIR/bin/flock" <<'MOCK'
#!/usr/bin/env bash
[ "${MOCK_FLOCK_FAIL:-false}" != true ]
MOCK

cat > "$TMP_DIR/bin/mariadb" <<'MOCK'
#!/usr/bin/env bash
[ -z "${AWS_ACCESS_KEY_ID:-}" ] && [ -z "${AWS_SECRET_ACCESS_KEY:-}" ] || {
  echo "AWS credentials leaked to mariadb" >&2
  exit 19
}
case " $* " in
  *" SHOW GRANTS FOR CURRENT_USER() "*)
    printf "GRANT USAGE ON *.* TO 'drill'@'127.0.0.1'\n"
    if [ "${MOCK_GLOBAL_GRANT:-false}" = true ]; then
      printf "GRANT SELECT ON *.* TO 'drill'@'127.0.0.1'\n"
    elif [ "${MOCK_MISSING_TARGET_GRANT:-false}" = true ]; then
      :
    else
      printf "GRANT ALL PRIVILEGES ON \`caskbycask_restore_drill_validation\`.* TO 'drill'@'127.0.0.1'\n"
    fi
    ;;
  *" SELECT CURRENT_ROLE() "*) printf 'NULL\n' ;;
  *"SELECT COUNT(*) FROM information_schema.tables"*)
    if [ -f "$IMPORT_STATE" ]; then printf '1\n'; else printf '0\n'; fi
    ;;
  *)
    cat >/dev/null
    : > "$IMPORT_STATE"
    ;;
esac
MOCK

cat > "$TMP_DIR/bin/mariadb-check" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK
chmod +x "$TMP_DIR/bin/aws" "$TMP_DIR/bin/mariadb" "$TMP_DIR/bin/mariadb-check"
chmod +x "$TMP_DIR/bin/flock"

if [ "$IS_WINDOWS" = true ]; then
  MARKER_FILE="$TMP_DIR/restore-drill-host"
  MACHINE_ID_FILE="$TMP_DIR/machine-id"
  printf '%s\n' 'caskbycask-isolated-restore-host-v1' > "$MARKER_FILE"
  printf '%s\n' 'windows-git-bash-test-machine' > "$MACHINE_ID_FILE"
else
  MARKER_FILE=/etc/caskbycask/restore-drill-host
  MACHINE_ID_FILE=/etc/machine-id
  sudo install -d -o root -g root -m 755 /etc/caskbycask
  printf '%s\n' 'caskbycask-isolated-restore-host-v1' \
    | sudo tee "$MARKER_FILE" >/dev/null
  sudo chmod 644 "$MARKER_FILE"
fi
MACHINE_ID=$(tr -d '[:space:]' < "$MACHINE_ID_FILE")
cat > "$TMP_DIR/backup.env" <<ENV
OCI_BACKUP_ACCESS_KEY_ID=restore-read-only
OCI_BACKUP_SECRET_ACCESS_KEY=restore-secret
OCI_BACKUP_ENDPOINT=https://testnamespace.compat.objectstorage.ap-chuncheon-1.oraclecloud.com
OCI_BACKUP_REGION=ap-chuncheon-1
OCI_BACKUP_BUCKET=test-backup-bucket
OCI_BACKUP_PREFIX=production
OCI_BACKUP_TARGET_CONFIRMATION=test-backup-bucket/production
RESTORE_DRILL_ISOLATION_CONFIRMED=true
RESTORE_DRILL_TEST_MARKER_FILE=$MARKER_FILE
RESTORE_DRILL_TEST_MACHINE_ID_FILE=$MACHINE_ID_FILE
RESTORE_DRILL_EXPECTED_MACHINE_ID=$MACHINE_ID
RESTORE_DRILL_TARGET_CAPACITY_CONFIRMED=true
RESTORE_DRILL_WORK_DIR=$TMP_DIR/work
RESTORE_DRILL_WORK_DIR_CONFIRMED=$TMP_DIR/work
RESTORE_DRILL_DB_HOST=127.0.0.1
RESTORE_DRILL_DB_PORT=3306
RESTORE_DRILL_DB_NAME=caskbycask_restore_drill_validation
RESTORE_DRILL_DB_USERNAME=drill
RESTORE_DRILL_DB_PASSWORD=test-password
RESTORE_DRILL_DB_TARGET_CONFIRMATION=127.0.0.1:3306/caskbycask_restore_drill_validation
RESTORE_DRILL_MAX_BACKUP_AGE_HOURS=36
RESTORE_DRILL_MIN_LOCAL_FREE_MB=0
RESTORE_DRILL_REQUIRE_UPLOADS=true
ENV
chmod 600 "$TMP_DIR/backup.env"

export AWS_LOG="$TMP_DIR/aws.log"
export MANIFEST_FIXTURE="$TMP_DIR/latest-manifest.env"
export DB_FIXTURE="$TMP_DIR/database.sql.gz"
export DB_SIZE
export MANIFEST_SIZE
export SENTINEL_SIZE
export GENERATION_SIZE
MANIFEST_SIZE=$(stat -c %s "$TMP_DIR/latest-manifest.env")
SENTINEL_SIZE=$(printf 'caskbycask-offsite-backup-v1\nbucket=test-backup-bucket\nprefix=production\n' | wc -c)
GENERATION_SIZE=$(printf 'status=complete\nrun_id=20260722T030000Z-22\n' | wc -c)
export IMPORT_STATE="$TMP_DIR/imported"
PATH="$TMP_DIR/bin:$PATH" \
BACKUP_ENV_FILE="$TMP_DIR/backup.env" \
BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
bash "$ROOT_DIR/deploy/server/restore-offsite-drill.sh"

[ -f "$IMPORT_STATE" ]
grep -q 'backup-20260722T030000Z-22.env' "$AWS_LOG"
! grep -q $'s3\tcp\ts3://test-backup-bucket/production/manifests/backup-20260721T030000Z-1.env' "$AWS_LOG"

rm -f "$IMPORT_STATE"
if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/backup.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  MOCK_GLOBAL_GRANT=true \
  bash "$ROOT_DIR/deploy/server/restore-offsite-drill.sh" >/dev/null 2>&1; then
  echo "restore account with global privilege unexpectedly accepted" >&2
  exit 1
fi
[ ! -f "$IMPORT_STATE" ]

if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/backup.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  MOCK_MANIFEST_OVERSIZE=true \
  bash "$ROOT_DIR/deploy/server/restore-offsite-drill.sh" >/dev/null 2>&1; then
  echo "oversized manifest unexpectedly accepted" >&2
  exit 1
fi
[ ! -f "$IMPORT_STATE" ]

cp "$TMP_DIR/backup.env" "$TMP_DIR/remote-target.env"
cat >> "$TMP_DIR/remote-target.env" <<'ENV'
RESTORE_DRILL_DB_HOST=prod-db.internal
RESTORE_DRILL_DB_TARGET_CONFIRMATION=prod-db.internal:3306/caskbycask_restore_drill_validation
ENV
chmod 600 "$TMP_DIR/remote-target.env"
if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/remote-target.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  bash "$ROOT_DIR/deploy/server/restore-offsite-drill.sh" >/dev/null 2>&1; then
  echo "remote database target unexpectedly accepted" >&2
  exit 1
fi

if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/backup.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  MOCK_MISSING_TARGET_GRANT=true \
  bash "$ROOT_DIR/deploy/server/restore-offsite-drill.sh" >/dev/null 2>&1; then
  echo "restore account without target grant unexpectedly accepted" >&2
  exit 1
fi

rm -f "$IMPORT_STATE"
if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/backup.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  MOCK_GENERATION_MISMATCH=true \
  bash "$ROOT_DIR/deploy/server/restore-offsite-drill.sh" >/dev/null 2>&1; then
  echo "mismatched upload generation unexpectedly accepted" >&2
  exit 1
fi
[ ! -f "$IMPORT_STATE" ]

: > "$AWS_LOG"
if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/backup.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  MOCK_FLOCK_FAIL=true \
  bash "$ROOT_DIR/deploy/server/restore-offsite-drill.sh" >/dev/null 2>&1; then
  echo "busy restore lock unexpectedly accepted" >&2
  exit 1
fi
[ ! -s "$AWS_LOG" ]

echo "restore drill isolation tests passed"
