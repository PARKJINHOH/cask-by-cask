#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP_DIR=$(mktemp -d)
cleanup() { rm -rf -- "$TMP_DIR"; }
trap cleanup EXIT

mkdir -p "$TMP_DIR/bin" "$TMP_DIR/backups"
cat > "$TMP_DIR/bin/mariadb-dump" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$ARGS_FILE"
printf '%s' "${JWT_SECRET-}" > "$EXPORTED_SECRET_FILE"
case "${1:-}" in
  --defaults-extra-file=*) ;;
  *) echo "defaults-extra-file must be the first option" >&2; exit 2 ;;
esac
cnf=${1#--defaults-extra-file=}
[ -f "$cnf" ] || { echo "client option file missing" >&2; exit 3; }
grep -q '^password=' "$cnf" || { echo "password missing from option file" >&2; exit 4; }
if [ "${MOCK_DUMP_FAIL:-false}" = true ]; then
  printf '%s\n' 'partial dump'
  exit 5
fi
printf '%s\n' 'CREATE TABLE backup_smoke_test (id BIGINT);'
MOCK
chmod +x "$TMP_DIR/bin/mariadb-dump"
cat > "$TMP_DIR/bin/flock" <<'MOCK'
#!/usr/bin/env bash
[ "${MOCK_FLOCK_FAIL:-false}" != true ]
MOCK
chmod +x "$TMP_DIR/bin/flock"

cat > "$TMP_DIR/api.env" <<'ENV'
DB_HOST=127.0.0.1
DB_USERNAME=caskbycask
DB_PASSWORD='test value with "quote" and \backslash'
JWT_SECRET=must_not_be_exported_to_dump
SLACK_WEBHOOK_URL=
LOCAL_BACKUP_RETENTION_DAYS=3
ENV
chmod 600 "$TMP_DIR/api.env"

export ARGS_FILE="$TMP_DIR/mariadb-dump.args"
export EXPORTED_SECRET_FILE="$TMP_DIR/exported-secret"
PATH="$TMP_DIR/bin:$PATH" \
API_ENV_FILE="$TMP_DIR/api.env" \
LOCAL_DB_BACKUP_DIR="$TMP_DIR/backups" \
BACKUP_RUNTIME_DIR="$TMP_DIR" \
BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
bash "$ROOT_DIR/deploy/server/backup-db.sh"

if grep -Fq 'test value' "$ARGS_FILE"; then
  echo "DB password leaked to mariadb-dump argv" >&2
  exit 1
fi
grep -q '^--defaults-extra-file=' "$ARGS_FILE"
[ ! -s "$EXPORTED_SECRET_FILE" ]
[ -z "$(find "$TMP_DIR/backups" -maxdepth 1 -name '.mariadb-client.*' -print)" ]
[ -z "$(find "$TMP_DIR" -maxdepth 1 -name 'caskbycask-mariadb-client.*' -print)" ]
[ -z "$(find "$TMP_DIR/backups" -maxdepth 1 -name '*.part' -print)" ]

BACKUP_FILE=$(find "$TMP_DIR/backups" -maxdepth 1 -name '*.sql.gz' -print -quit)
[ -n "$BACKUP_FILE" ]
gzip -t "$BACKUP_FILE"

BEFORE_COUNT=$(find "$TMP_DIR/backups" -maxdepth 1 -name '*.sql.gz' -printf x | wc -c)
if PATH="$TMP_DIR/bin:$PATH" \
  API_ENV_FILE="$TMP_DIR/api.env" \
  LOCAL_DB_BACKUP_DIR="$TMP_DIR/backups" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" \
  BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  MOCK_DUMP_FAIL=true \
  bash "$ROOT_DIR/deploy/server/backup-db.sh" >/dev/null 2>&1; then
  echo "failed dump unexpectedly succeeded" >&2
  exit 1
fi
AFTER_COUNT=$(find "$TMP_DIR/backups" -maxdepth 1 -name '*.sql.gz' -printf x | wc -c)
[ "$BEFORE_COUNT" -eq "$AFTER_COUNT" ]
[ -z "$(find "$TMP_DIR/backups" -maxdepth 1 -name '*.part' -print)" ]

if PATH="$TMP_DIR/bin:$PATH" \
  API_ENV_FILE="$TMP_DIR/api.env" \
  LOCAL_DB_BACKUP_DIR="$TMP_DIR/backups" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" \
  BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  BACKUP_DB_NAME='../unsafe' \
  bash "$ROOT_DIR/deploy/server/backup-db.sh" >/dev/null 2>&1; then
  echo "unsafe DB name unexpectedly accepted" >&2
  exit 1
fi

rm -f "$ARGS_FILE"
if PATH="$TMP_DIR/bin:$PATH" \
  API_ENV_FILE="$TMP_DIR/api.env" \
  LOCAL_DB_BACKUP_DIR="$TMP_DIR/backups" \
  BACKUP_RUNTIME_DIR="$TMP_DIR" \
  BACKUP_LOCK_FILE="$TMP_DIR/backup.lock" \
  MOCK_FLOCK_FAIL=true \
  bash "$ROOT_DIR/deploy/server/backup-db.sh" >/dev/null 2>&1; then
  echo "busy backup lock unexpectedly accepted" >&2
  exit 1
fi
[ ! -e "$ARGS_FILE" ]
echo "backup-db smoke test passed"
