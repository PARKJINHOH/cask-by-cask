#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP_DIR=$(mktemp -d)
cleanup() { rm -rf -- "$TMP_DIR"; }
trap cleanup EXIT

mkdir -p "$TMP_DIR/bin" "$TMP_DIR/backups" "$TMP_DIR/uploads"
printf '%s\n' 'CREATE TABLE offsite_smoke_test (id BIGINT);' | gzip > \
  "$TMP_DIR/backups/caskbycask_prod_20260722_030000.sql.gz"
printf '%s\n' 'caskbycask-upload-root-v1' > "$TMP_DIR/uploads/.caskbycask-upload-root"
printf '%s' 'image' > "$TMP_DIR/uploads/sample.jpg"

cat > "$TMP_DIR/bin/aws" <<'MOCK'
#!/usr/bin/env bash
if [ "${1:-}" = --version ]; then
  echo 'aws-cli/2.test Python/test Linux/test'
  exit 0
fi
printf '%s\t' "$@" >> "$AWS_LOG"
printf '\n' >> "$AWS_LOG"
if [ "${1:-}" = s3api ] && [ "${2:-}" = head-bucket ]; then
  exit 0
fi
if [ "${1:-}" = s3api ] && [ "${2:-}" = head-object ]; then
  if [ "${MOCK_SENTINEL_OVERSIZE:-false}" = true ]; then printf '5000\n'; else printf '%s\n' "$SENTINEL_SIZE"; fi
  exit 0
fi
if [ "${1:-}" = s3 ] && [ "${2:-}" = cp ] \
    && [[ "${3:-}" == */.caskbycask-backup-target ]]; then
  if [ "${MOCK_SENTINEL_MISMATCH:-false}" = true ]; then
    printf '%s\n' 'wrong-target' > "${4}"
  else
    printf 'caskbycask-offsite-backup-v1\nbucket=test-backup-bucket\nprefix=production\n' > "${4}"
  fi
  exit 0
fi
if [ "${1:-}" = s3 ] && [ "${2:-}" = sync ]; then
  printf '%s\n' sync >> "$EVENT_LOG"
  if [[ " $* " == *" --dryrun "* ]]; then
    printf '(dryrun) delete: s3://test-backup-bucket/production/uploads/current/old.jpg\n'
    exit 0
  fi
  if [ "${MOCK_SYNC_FAIL:-false}" = true ]; then
    exit 9
  fi
  exit 0
fi
if [ "${1:-}" = s3 ] && [ "${2:-}" = cp ] \
    && [[ "${4:-}" == */uploads/current/.caskbycask-generation ]]; then
  cp "${3}" "$GENERATION_CAPTURE"
  printf 'generation:%s\n' "$(sed -n 's/^status=//p' "${3}")" >> "$EVENT_LOG"
  exit 0
fi
if [ "${1:-}" = s3 ] && [ "${2:-}" = cp ] \
    && [[ "${4:-}" == */manifests/backup-*.env ]]; then
  cp "${3}" "$MANIFEST_CAPTURE"
  printf '%s\n' manifest >> "$EVENT_LOG"
  exit 0
fi
exit 0
MOCK
chmod +x "$TMP_DIR/bin/aws"
cat > "$TMP_DIR/bin/flock" <<'MOCK'
#!/usr/bin/env bash
[ "${MOCK_FLOCK_FAIL:-false}" != true ]
MOCK
chmod +x "$TMP_DIR/bin/flock"

cat > "$TMP_DIR/backup.env" <<ENV
OCI_BACKUP_ACCESS_KEY_ID=test-access
OCI_BACKUP_SECRET_ACCESS_KEY=test-secret
OCI_BACKUP_ENDPOINT=https://testnamespace.compat.objectstorage.ap-chuncheon-1.oraclecloud.com
OCI_BACKUP_REGION=ap-chuncheon-1
OCI_BACKUP_BUCKET=test-backup-bucket
OCI_BACKUP_PREFIX=production
OCI_BACKUP_VERSIONING_CONFIRMED=true
OCI_BACKUP_TARGET_CONFIRMATION=test-backup-bucket/production
LOCAL_DB_BACKUP_DIR=$TMP_DIR/backups
UPLOAD_PATH=$TMP_DIR/uploads
OFFSITE_DB_SOURCE_CONFIRMED=$TMP_DIR/backups
OFFSITE_UPLOAD_SOURCE_CONFIRMED=$TMP_DIR/uploads
OFFSITE_MAX_DB_AGE_HOURS=26
BACKUP_SLACK_WEBHOOK_URL=
ENV
chmod 600 "$TMP_DIR/backup.env"

export AWS_LOG="$TMP_DIR/aws.log"
export MANIFEST_CAPTURE="$TMP_DIR/manifest.env"
export GENERATION_CAPTURE="$TMP_DIR/generation.env"
export EVENT_LOG="$TMP_DIR/events.log"
export SENTINEL_SIZE
SENTINEL_SIZE=$(printf 'caskbycask-offsite-backup-v1\nbucket=test-backup-bucket\nprefix=production\n' | wc -c)
PATH="$TMP_DIR/bin:$PATH" \
BACKUP_ENV_FILE="$TMP_DIR/backup.env" \
BACKUP_RUNTIME_DIR="$TMP_DIR" \
BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
bash "$ROOT_DIR/deploy/server/backup-offsite.sh"

[ -s "$MANIFEST_CAPTURE" ]
grep -q '^format=caskbycask-offsite-v1$' "$MANIFEST_CAPTURE"
grep -q '^database_sha256=[0-9a-f]\{64\}$' "$MANIFEST_CAPTURE"
grep -q '^uploads_generation=' "$MANIFEST_CAPTURE"
grep -q '^upload_file_count=1$' "$MANIFEST_CAPTURE"
grep -q '^status=complete$' "$GENERATION_CAPTURE"
GENERATION_RUN=$(sed -n 's/^run_id=//p' "$GENERATION_CAPTURE")
grep -q "^uploads_generation=${GENERATION_RUN}$" "$MANIFEST_CAPTURE"
EXPECTED_EVENTS=$'generation:in-progress\nsync\ngeneration:complete\nmanifest'
[ "$(cat "$EVENT_LOG")" = "$EXPECTED_EVENTS" ]
SYNC_LINE=$(grep $'s3\tsync\t' "$AWS_LOG")
[[ "$SYNC_LINE" != *$'--delete\t'* ]]
SYNC_NUMBER=$(grep -n $'s3\tsync\t' "$AWS_LOG" | cut -d: -f1)
MANIFEST_NUMBER=$(grep -n '/manifests/backup-' "$AWS_LOG" | cut -d: -f1)
[ "$SYNC_NUMBER" -lt "$MANIFEST_NUMBER" ]

cp "$TMP_DIR/backup.env" "$TMP_DIR/unsafe-source.env"
printf '%s\n' 'OFFSITE_UPLOAD_SOURCE_CONFIRMED=/app' >> "$TMP_DIR/unsafe-source.env"
chmod 600 "$TMP_DIR/unsafe-source.env"
: > "$AWS_LOG"
if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/unsafe-source.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  bash "$ROOT_DIR/deploy/server/backup-offsite.sh" >/dev/null 2>&1; then
  echo "unsafe upload source confirmation unexpectedly succeeded" >&2
  exit 1
fi
[ ! -s "$AWS_LOG" ]

: > "$AWS_LOG"
if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/backup.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  MOCK_SENTINEL_MISMATCH=true \
  bash "$ROOT_DIR/deploy/server/backup-offsite.sh" >/dev/null 2>&1; then
  echo "mismatched remote sentinel unexpectedly accepted" >&2
  exit 1
fi
[ -z "$(grep $'s3\tsync\t' "$AWS_LOG" || true)" ]

: > "$AWS_LOG"
if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/backup.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  MOCK_SENTINEL_OVERSIZE=true \
  bash "$ROOT_DIR/deploy/server/backup-offsite.sh" >/dev/null 2>&1; then
  echo "oversized remote sentinel unexpectedly accepted" >&2
  exit 1
fi
[ -z "$(grep $'s3\tcp\t' "$AWS_LOG" || true)" ]

cp "$TMP_DIR/backup.env" "$TMP_DIR/delete-unsafe.env"
printf '%s\n' 'OFFSITE_SYNC_DELETE_ENABLED=true' >> "$TMP_DIR/delete-unsafe.env"
chmod 600 "$TMP_DIR/delete-unsafe.env"
: > "$AWS_LOG"
if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/delete-unsafe.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  bash "$ROOT_DIR/deploy/server/backup-offsite.sh" >/dev/null 2>&1; then
  echo "remote delete without exact target confirmation unexpectedly succeeded" >&2
  exit 1
fi
[ ! -s "$AWS_LOG" ]

rm -f "$MANIFEST_CAPTURE"
rm -f "$GENERATION_CAPTURE"
: > "$AWS_LOG"
if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/backup.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  MOCK_SYNC_FAIL=true \
  bash "$ROOT_DIR/deploy/server/backup-offsite.sh" >/dev/null 2>&1; then
  echo "failed upload sync unexpectedly succeeded" >&2
  exit 1
fi
[ ! -e "$MANIFEST_CAPTURE" ]
[ -e "$GENERATION_CAPTURE" ]
grep -q '^status=in-progress$' "$GENERATION_CAPTURE"
[ -z "$(grep '/manifests/backup-' "$AWS_LOG" || true)" ]

: > "$AWS_LOG"
if PATH="$TMP_DIR/bin:$PATH" \
  BACKUP_ENV_FILE="$TMP_DIR/backup.env" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  MOCK_FLOCK_FAIL=true \
  bash "$ROOT_DIR/deploy/server/backup-offsite.sh" >/dev/null 2>&1; then
  echo "busy offsite lock unexpectedly accepted" >&2
  exit 1
fi
[ ! -s "$AWS_LOG" ]

echo "offsite backup safety tests passed"
