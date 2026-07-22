#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
CONF=${1:-"$REPO_ROOT/deploy/nginx/caskbycask.conf"}

[[ -f "$CONF" ]] || {
    echo "nginx config not found: $CONF" >&2
    exit 1
}

SERVER_BASELINE=$(awk '
    {
        directive = $0
        sub(/[[:space:]]*#.*/, "", directive)
    }
    directive ~ /server_name[[:space:]]+www\.caskbycask\.net;/ { inside = 1 }
    inside && directive ~ /^[[:space:]]*location[[:space:]]/ { exit }
    inside { print directive }
' "$CONF")

for required in \
    'add_header X-Content-Type-Options "nosniff" always;' \
    'add_header X-Frame-Options "DENY" always;' \
    'add_header Referrer-Policy "strict-origin-when-cross-origin" always;'
do
    grep -Fq "$required" <<<"$SERVER_BASELINE" || {
        echo "missing www server baseline header: $required" >&2
        exit 1
    }
done

# nginx는 location에 자체 add_header가 하나라도 있으면 상위 add_header를 상속하지 않는다.
# 모든 해당 location이 공통 보안 헤더를 명시하는지 정적으로 검증한다.
awk '
function finish_location() {
    if (has_header && (!has_nosniff || !has_frame || !has_referrer)) {
        printf "missing baseline security headers: %s\n", label > "/dev/stderr"
        failed = 1
    }
}

{
    if (!inside && $0 ~ /^[[:space:]]*location[[:space:]]/) {
        inside = 1
        started = 0
        depth = 0
        has_header = 0
        has_nosniff = 0
        has_frame = 0
        has_referrer = 0
        label = $0
    }

    if (inside) {
        directive = $0
        sub(/[[:space:]]*#.*/, "", directive)
        if (directive ~ /add_header[[:space:]]+/) has_header = 1
        if (directive ~ /add_header[[:space:]]+X-Content-Type-Options[[:space:]]+"nosniff"[[:space:]]+always;/) has_nosniff = 1
        if (directive ~ /add_header[[:space:]]+X-Frame-Options[[:space:]]+"DENY"[[:space:]]+always;/) has_frame = 1
        if (directive ~ /add_header[[:space:]]+Referrer-Policy[[:space:]]+"strict-origin-when-cross-origin"[[:space:]]+always;/) has_referrer = 1

        braces = directive
        opens_line = braces
        closes_line = braces
        opens = gsub(/\{/, "{", opens_line)
        closes = gsub(/\}/, "}", closes_line)
        if (opens > 0) started = 1
        depth += opens - closes

        if (started && depth == 0) {
            finish_location()
            inside = 0
        }
    }
}

END {
    if (inside) finish_location()
    exit failed
}
' "$CONF"

echo "nginx location security header inheritance check passed"
