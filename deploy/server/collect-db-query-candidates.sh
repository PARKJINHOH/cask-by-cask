#!/usr/bin/env bash
set -Eeuo pipefail

# 운영 DB를 변경하지 않고 performance_schema의 정규화된 query digest만 수집한다.
# 실행 SQL은 SELECT/SHOW로 제한되어 있으며 EXPLAIN/ANALYZE/DDL/DML을 실행하지 않는다.

DB_AUDIT_CONFIG_FILE="${DB_AUDIT_CONFIG_FILE:-/app/env/db-observer.cnf}"
DB_NAME="${DB_NAME:-caskbycask_prod}"
DIGEST_LIMIT="${DIGEST_LIMIT:-30}"
DB_CONNECT_TIMEOUT_SECONDS="${DB_CONNECT_TIMEOUT_SECONDS:-5}"
DB_AUDIT_TIMEOUT_SECONDS="${DB_AUDIT_TIMEOUT_SECONDS:-20}"

supports_posix_permissions() {
  case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) return 1 ;; *) return 0 ;; esac
}

if [[ ! -f "${DB_AUDIT_CONFIG_FILE}" || -L "${DB_AUDIT_CONFIG_FILE}" || ! -r "${DB_AUDIT_CONFIG_FILE}" ]]; then
  echo "ERROR: MariaDB client option file must be a readable regular file, not a symlink: ${DB_AUDIT_CONFIG_FILE}" >&2
  echo "See deploy/server/DB-QUERY-TUNING.md." >&2
  exit 1
fi

if supports_posix_permissions; then
  if [[ ! -O "${DB_AUDIT_CONFIG_FILE}" ]]; then
    echo "ERROR: MariaDB client option file must be owned by the executing user: ${DB_AUDIT_CONFIG_FILE}" >&2
    exit 1
  fi

  config_mode="$(stat -c '%a' -- "${DB_AUDIT_CONFIG_FILE}")"
  if [[ ! "${config_mode}" =~ ^[0-7]{3,4}$ || "${config_mode: -2}" != "00" ]]; then
    echo "ERROR: MariaDB client option file must not grant group/other permissions (recommended: chmod 600)." >&2
    exit 1
  fi
fi

if [[ ! "${DB_NAME}" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "ERROR: DB_NAME may contain only letters, digits and underscore." >&2
  exit 1
fi

if [[ ! "${DIGEST_LIMIT}" =~ ^[1-9][0-9]*$ ]] || (( DIGEST_LIMIT > 200 )); then
  echo "ERROR: DIGEST_LIMIT must be between 1 and 200." >&2
  exit 1
fi

if [[ ! "${DB_CONNECT_TIMEOUT_SECONDS}" =~ ^[1-9][0-9]*$ ]] || (( DB_CONNECT_TIMEOUT_SECONDS > 60 )); then
  echo "ERROR: DB_CONNECT_TIMEOUT_SECONDS must be between 1 and 60." >&2
  exit 1
fi

if [[ ! "${DB_AUDIT_TIMEOUT_SECONDS}" =~ ^[1-9][0-9]*$ ]] || (( DB_AUDIT_TIMEOUT_SECONDS > 120 )); then
  echo "ERROR: DB_AUDIT_TIMEOUT_SECONDS must be between 1 and 120." >&2
  exit 1
fi

MARIADB_BIN="${MARIADB_BIN:-mariadb}"
if ! command -v "${MARIADB_BIN}" >/dev/null 2>&1; then
  echo "ERROR: MariaDB client not found: ${MARIADB_BIN}" >&2
  exit 1
fi

if ! command -v timeout >/dev/null 2>&1; then
  echo "ERROR: GNU timeout is required." >&2
  exit 1
fi

run_mariadb() {
  timeout --signal=TERM --kill-after=2s "${DB_AUDIT_TIMEOUT_SECONDS}s" \
    "${MARIADB_BIN}" \
    --defaults-extra-file="${DB_AUDIT_CONFIG_FILE}" \
    --connect-timeout="${DB_CONNECT_TIMEOUT_SECONDS}" \
    --batch \
    --raw \
    "$@"
}

performance_schema_enabled="$(run_mariadb --skip-column-names --execute='SELECT @@GLOBAL.performance_schema;')"
performance_schema_enabled="${performance_schema_enabled//$'\r'/}"
if [[ "${performance_schema_enabled}" != "1" ]]; then
  echo "ERROR: performance_schema is disabled; no query candidates can be measured. No server setting was changed." >&2
  exit 1
fi

digest_consumer_enabled="$(run_mariadb --skip-column-names --execute="SELECT ENABLED FROM performance_schema.setup_consumers WHERE NAME = 'statements_digest';")"
digest_consumer_enabled="${digest_consumer_enabled//$'\r'/}"
if [[ "${digest_consumer_enabled}" != "YES" ]]; then
  echo "ERROR: performance_schema consumer statements_digest is not enabled. No server setting was changed." >&2
  exit 1
fi

select_instrument_state="$(run_mariadb --skip-column-names --execute="SELECT CONCAT(ENABLED, ':', TIMED) FROM performance_schema.setup_instruments WHERE NAME = 'statement/sql/select';")"
select_instrument_state="${select_instrument_state//$'\r'/}"
if [[ "${select_instrument_state}" != "YES:YES" ]]; then
  echo "ERROR: performance_schema instrument statement/sql/select must be ENABLED and TIMED. No server setting was changed." >&2
  exit 1
fi

run_mariadb <<SQL
SELECT NOW() AS collected_at, '${DB_NAME}' AS target_schema, CURRENT_USER() AS authenticated_account;

SHOW GLOBAL VARIABLES WHERE Variable_name IN ('performance_schema', 'slow_query_log', 'long_query_time');

SHOW GLOBAL STATUS WHERE Variable_name IN (
  'Questions',
  'Slow_queries',
  'Created_tmp_disk_tables',
  'Select_full_join',
  'Select_scan',
  'Sort_merge_passes'
);

SELECT
  DIGEST,
  LEFT(DIGEST_TEXT, 1000) AS normalized_query,
  COUNT_STAR AS executions,
  ROUND(SUM_TIMER_WAIT / 1000000000000, 3) AS total_seconds,
  ROUND(AVG_TIMER_WAIT / 1000000000, 3) AS avg_milliseconds,
  ROUND(SUM_ROWS_EXAMINED / NULLIF(COUNT_STAR, 0), 1) AS rows_examined_per_execution,
  ROUND(SUM_ROWS_SENT / NULLIF(COUNT_STAR, 0), 1) AS rows_sent_per_execution,
  SUM_NO_INDEX_USED AS executions_without_index,
  SUM_NO_GOOD_INDEX_USED AS executions_without_good_index,
  FIRST_SEEN,
  LAST_SEEN
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME = '${DB_NAME}'
  AND DIGEST_TEXT LIKE 'SELECT %'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT ${DIGEST_LIMIT};
SQL
