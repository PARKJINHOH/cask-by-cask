#!/bin/bash
# 시놀로지 작업 스케줄러가 호출하는 래퍼.
# - flock 으로 중복 실행 방지(이전 실행이 길어져도 겹치지 않음)
# - venv 활성화 후 main.py 실행
# 작업 스케줄러 등록 예: bash /volume1/caskbycask/caskbycask-crawler/run.sh

set -euo pipefail

APP_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="/tmp/caskbycask-crawler.lock"

cd "$APP_DIR"

# 동시 실행 방지: 락을 못 잡으면 즉시 종료(직전 실행이 아직 도는 중)
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[run.sh] 이전 실행이 진행 중 — 이번 회차 건너뜀"
  exit 0
fi

PYTHON="$APP_DIR/.venv/bin/python"
if [ ! -x "$PYTHON" ]; then
  echo "[run.sh] 릴리스 가상환경을 찾을 수 없습니다: $PYTHON" >&2
  exit 1
fi

exec "$PYTHON" "$APP_DIR/main.py"
