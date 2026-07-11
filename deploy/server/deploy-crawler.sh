#!/bin/bash
set -euo pipefail

BASE_DIR="/app/caskbycask-crawler"
ARCHIVE="/app/caskbycask-crawler-dist.tar.gz"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_DIR="$BASE_DIR/releases/$RELEASE_ID"
CURRENT_LINK="$BASE_DIR/current"
PREVIOUS_LINK="$BASE_DIR/previous"

if [ ! -f "$ARCHIVE" ]; then
  echo "crawler archive not found: $ARCHIVE" >&2
  exit 1
fi

mkdir -p "$BASE_DIR/releases" "$BASE_DIR/logs" "$BASE_DIR/temp"
mkdir -p "$RELEASE_DIR"
tar -xzf "$ARCHIVE" -C "$RELEASE_DIR" --strip-components=1

# 기존 수동 설치의 영속 파일을 그대로 사용한다. 배포 아카이브에는 포함되지 않는다.
if [ ! -f "$BASE_DIR/.env" ]; then
  echo "$BASE_DIR/.env is required. Copy .env.example and configure secrets first." >&2
  exit 1
fi

if [ ! -d "$BASE_DIR/.venv" ]; then
  python3 -m venv "$BASE_DIR/.venv"
fi
source "$BASE_DIR/.venv/bin/activate"
python3 -m pip install --upgrade pip
python3 -m pip install -r "$RELEASE_DIR/requirements.txt"
python3 -m compileall -q "$RELEASE_DIR"

ln -s "$BASE_DIR/.env" "$RELEASE_DIR/.env"
ln -s "$BASE_DIR/.venv" "$RELEASE_DIR/.venv"
chmod +x "$RELEASE_DIR/run.sh" "$RELEASE_DIR/run-news.sh"

if [ -L "$CURRENT_LINK" ]; then
  CURRENT_TARGET="$(readlink -f "$CURRENT_LINK")"
  ln -sfn "$CURRENT_TARGET" "$PREVIOUS_LINK"
fi
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

# current와 previous 두 릴리스만 남긴다. 영속 파일은 releases 밖에 있어 영향받지 않는다.
CURRENT_TARGET="$(readlink -f "$CURRENT_LINK")"
PREVIOUS_TARGET="$(readlink -f "$PREVIOUS_LINK" 2>/dev/null || true)"
for candidate in "$BASE_DIR"/releases/*; do
  [ -d "$candidate" ] || continue
  candidate_target="$(readlink -f "$candidate")"
  if [ "$candidate_target" != "$CURRENT_TARGET" ] && [ "$candidate_target" != "$PREVIOUS_TARGET" ]; then
    rm -rf -- "$candidate"
  fi
done

# 기존 핫딜 작업과 AI 소식 작업을 모두 현재 릴리스로 고정한다.
(
  crontab -l 2>/dev/null \
    | grep -v 'caskbycask-crawler/.*/run.sh' \
    | grep -v 'caskbycask-crawler/run.sh' \
    | grep -v 'caskbycask-crawler/.*/run-news.sh' \
    | grep -v 'caskbycask-crawler/run-news.sh' || true
  echo 'CRON_TZ=Asia/Seoul'
  echo '0 */2 * * * /app/caskbycask-crawler/current/run.sh >> /app/caskbycask-crawler/logs/cron.log 2>&1'
  echo '17 */2 * * * /app/caskbycask-crawler/current/run-news.sh >> /app/caskbycask-crawler/logs/ai-news-cron.log 2>&1'
) | crontab -

rm -f "$ARCHIVE"
echo "crawler deployed: $RELEASE_DIR"
