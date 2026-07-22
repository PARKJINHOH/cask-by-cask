#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/bin"
FAKE_MARIADB_LOG="$TMP_DIR/mariadb.log"
export FAKE_MARIADB_LOG

cat > "$TMP_DIR/bin/mariadb" <<'FAKE'
#!/usr/bin/env bash
set -Eeuo pipefail

query=''
printf 'ARGS' >> "$FAKE_MARIADB_LOG"
for arg in "$@"; do
  printf '\t%s' "$arg" >> "$FAKE_MARIADB_LOG"
  case "$arg" in
    --execute=*) query=${arg#--execute=} ;;
  esac
done
printf '\n' >> "$FAKE_MARIADB_LOG"

case "$query" in
  *'@@GLOBAL.performance_schema'*) printf '%s\n' "${FAKE_PS_ENABLED:-1}" ;;
  *'setup_consumers'*) printf '%s\n' "${FAKE_DIGEST_ENABLED:-YES}" ;;
  *'setup_instruments'*) printf '%s\n' "${FAKE_SELECT_INSTRUMENT_STATE:-YES:YES}" ;;
  '')
    printf 'SQL\n' >> "$FAKE_MARIADB_LOG"
    tee -a "$FAKE_MARIADB_LOG" >/dev/null
    printf 'fake digest output\n'
    ;;
  *)
    echo "unexpected query: $query" >&2
    exit 2
    ;;
esac
FAKE
chmod +x "$TMP_DIR/bin/mariadb"

cat > "$TMP_DIR/db-observer.cnf" <<'ENV'
[client]
host=127.0.0.1
user=observer
password=test-only
ENV
chmod 600 "$TMP_DIR/db-observer.cnf"

run_collector() {
  DB_AUDIT_CONFIG_FILE="$TMP_DIR/db-observer.cnf" \
  DB_NAME=caskbycask_prod \
  MARIADB_BIN="$TMP_DIR/bin/mariadb" \
  bash "$ROOT_DIR/deploy/server/collect-db-query-candidates.sh"
}

output=$(run_collector)
[ "$output" = 'fake digest output' ]
grep -q "SCHEMA_NAME = 'caskbycask_prod'" "$FAKE_MARIADB_LOG"
! grep -q 'SHOW GRANTS' "$FAKE_MARIADB_LOG"
! grep -q -- '--database' "$FAKE_MARIADB_LOG"

if FAKE_PS_ENABLED=0 run_collector >/dev/null 2>&1; then
  echo "disabled performance_schema unexpectedly accepted" >&2
  exit 1
fi

if FAKE_DIGEST_ENABLED=NO run_collector >/dev/null 2>&1; then
  echo "disabled statements_digest consumer unexpectedly accepted" >&2
  exit 1
fi

if FAKE_SELECT_INSTRUMENT_STATE=YES:NO run_collector >/dev/null 2>&1; then
  echo "untimed SELECT instrument unexpectedly accepted" >&2
  exit 1
fi

if DB_AUDIT_CONFIG_FILE="$TMP_DIR/db-observer.cnf" \
  DB_NAME='caskbycask_prod;DROP' \
  MARIADB_BIN="$TMP_DIR/bin/mariadb" \
  bash "$ROOT_DIR/deploy/server/collect-db-query-candidates.sh" >/dev/null 2>&1; then
  echo "unsafe DB_NAME unexpectedly accepted" >&2
  exit 1
fi

chmod 644 "$TMP_DIR/db-observer.cnf"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) ;;
  *)
    if run_collector >/dev/null 2>&1; then
      echo "group/other-readable option file unexpectedly accepted" >&2
      exit 1
    fi
    ;;
esac

echo "DB query candidate collector safety tests passed"
