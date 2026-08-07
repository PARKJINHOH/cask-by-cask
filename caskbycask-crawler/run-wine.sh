#!/bin/bash
set -euo pipefail

APP_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="/tmp/caskbycask-wine-crawler.lock"
cd "$APP_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[run-wine.sh] 이전 와인 실행이 진행 중 — 이번 회차 건너뜀"
  exit 0
fi
exec "$APP_DIR/.venv/bin/python" "$APP_DIR/wine_main.py" --enqueue-scheduled
