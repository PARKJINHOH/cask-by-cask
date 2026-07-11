#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="/tmp/caskbycask-ai-news.lock"

cd "$APP_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[run-news.sh] 이전 AI 소식 작업이 실행 중이므로 건너뜁니다."
  exit 0
fi

if [ -f "$APP_DIR/.venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$APP_DIR/.venv/bin/activate"
fi

python3 news_main.py
