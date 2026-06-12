#!/bin/bash
# 시놀로지 작업 스케줄러가 호출하는 래퍼.
# - flock 으로 중복 실행 방지(이전 실행이 길어져도 겹치지 않음)
# - venv 활성화 후 main.py 실행
# 작업 스케줄러 등록 예: bash /volume1/drinkindex/drinkindex-crawler/run.sh

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="/tmp/drinkindex-crawler.lock"

cd "$APP_DIR"

# 동시 실행 방지: 락을 못 잡으면 즉시 종료(직전 실행이 아직 도는 중)
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[run.sh] 이전 실행이 진행 중 — 이번 회차 건너뜀"
  exit 0
fi

# 가상환경 활성화 (없으면 시스템 python3 사용)
if [ -f "$APP_DIR/.venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$APP_DIR/.venv/bin/activate"
fi

python3 main.py
