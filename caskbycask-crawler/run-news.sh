#!/bin/bash
set -euo pipefail

APP_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="/tmp/caskbycask-ai-news.lock"

cd "$APP_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[run-news.sh] 이전 AI 소식 작업이 실행 중이므로 건너뜁니다."
  exit 0
fi

PYTHON="$APP_DIR/.venv/bin/python"
if [ ! -x "$PYTHON" ]; then
  echo "[run-news.sh] 릴리스 가상환경을 찾을 수 없습니다: $PYTHON" >&2
  exit 1
fi

exec "$PYTHON" "$APP_DIR/news_main.py"
