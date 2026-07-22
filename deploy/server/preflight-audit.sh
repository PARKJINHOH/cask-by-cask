#!/usr/bin/env bash
# Read-only production preflight for CaskByCask.
#
# Usage:
#   ./preflight-audit.sh
#   sudo ./preflight-audit.sh --db
#
# --db uses the local MariaDB administrative socket. It only executes SELECT and
# SHOW statements and never prints credentials, user emails, or tokens.

set -uo pipefail

WITH_DB=false
if [[ "${1:-}" == "--db" ]]; then
    WITH_DB=true
elif [[ $# -gt 0 ]]; then
    echo "Usage: $0 [--db]" >&2
    exit 2
fi

section() {
    printf '\n[%s]\n' "$1"
}

command_version() {
    local name="$1"
    shift
    if command -v "$name" >/dev/null 2>&1; then
        "$@" 2>&1 | head -n 2
    else
        printf '%s: not installed\n' "$name"
    fi
}

service_state() {
    local name="$1"
    if command -v systemctl >/dev/null 2>&1; then
        printf '%s active=%s enabled=%s\n' \
            "$name" \
            "$(systemctl is-active "$name" 2>/dev/null || true)" \
            "$(systemctl is-enabled "$name" 2>/dev/null || true)"
    fi
}

http_probe() {
    local label="$1"
    local url="$2"
    if ! command -v curl >/dev/null 2>&1; then
        printf '%s curl=not-installed\n' "$label"
        return
    fi

    local result
    result=$(curl --silent --show-error --output /dev/null \
        --max-time 10 \
        --write-out 'status=%{http_code} time=%{time_total}s type=%{content_type}' \
        "$url" 2>&1) || true
    printf '%s %s\n' "$label" "$result"
}

section "timestamp"
date --iso-8601=seconds
printf 'timezone=%s\n' "$(timedatectl show --property=Timezone --value 2>/dev/null || date +%Z)"

section "host"
uname -a
printf 'architecture=%s\n' "$(uname -m)"
if [[ -r /etc/os-release ]]; then
    . /etc/os-release
    printf 'os=%s\n' "${PRETTY_NAME:-unknown}"
fi
printf 'uptime='; uptime -p 2>/dev/null || true
free -h 2>/dev/null || true
df -h / /app 2>/dev/null | awk 'NR == 1 || !seen[$NF]++'

section "runtime"
command_version node node --version
command_version java java -version
command_version python3 python3 --version
command_version mariadb mariadb --version
command_version nginx nginx -v

section "services"
service_state caskbycask-api
service_state caskbycask-web
service_state nginx
service_state mariadb
service_state redis-server

section "local health"
http_probe api-readiness http://127.0.0.1:8081/actuator/health/readiness
http_probe web-health http://127.0.0.1:3000/healthz
http_probe nginx-root http://127.0.0.1/

section "artifacts"
for path in /app/spring-boot/app.jar /app/next/dist /app/caskbycask-crawler/current; do
    if [[ -e "$path" ]]; then
        stat --printf='%n type=%F modified=%y\n' "$path" 2>/dev/null || true
    else
        printf '%s missing\n' "$path"
    fi
done

section "backup"
for path in /app/db_backup /app/backup /app/upload; do
    if [[ -e "$path" ]]; then
        printf '%s size=%s newest=' "$path" "$(du -sh "$path" 2>/dev/null | awk '{print $1}')"
        find "$path" -type f -printf '%T@ %TY-%Tm-%TdT%TH:%TM:%TS%z %p\n' 2>/dev/null \
            | sort -nr \
            | head -n 1 \
            | cut -d' ' -f2- || true
    else
        printf '%s missing\n' "$path"
    fi
done
if command -v oci >/dev/null 2>&1; then
    printf 'oci-cli=installed\n'
else
    printf 'oci-cli=not-installed\n'
fi

if ! $WITH_DB; then
    section "database"
    printf 'skipped (run with sudo %s --db for read-only database checks)\n' "$0"
    exit 0
fi

section "database"
if ! command -v mariadb >/dev/null 2>&1; then
    printf 'mariadb client is not installed\n' >&2
    exit 1
fi

DB_NAME="${PREFLIGHT_DB_NAME:-caskbycask_prod}"
DB=(mariadb --batch --skip-column-names "$DB_NAME")

if ! "${DB[@]}" -e 'SELECT 1' >/dev/null 2>&1; then
    printf 'local administrative socket login failed; no credential fallback attempted\n' >&2
    exit 1
fi

"${DB[@]}" -e "
SELECT CONCAT('version=', VERSION());
SHOW VARIABLES WHERE Variable_name IN (
  'performance_schema',
  'slow_query_log',
  'long_query_time',
  'log_slow_rate_limit'
);
SELECT CONCAT(
  'role=', role,
  ' active_users=', COUNT(*),
  ' with_producer=', SUM(CASE WHEN producer_id IS NOT NULL THEN 1 ELSE 0 END)
)
FROM users
WHERE is_active = 1
GROUP BY role
ORDER BY role;
"
