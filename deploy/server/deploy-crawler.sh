#!/bin/bash
set -euo pipefail

BASE_DIR="${CRAWLER_BASE_DIR:-/app/caskbycask-crawler}"
ARCHIVE="${CRAWLER_ARCHIVE:-/app/caskbycask-crawler-dist.tar.gz}"
DEPLOY_LOCK_FILE="${CRAWLER_DEPLOY_LOCK_FILE:-/tmp/caskbycask-crawler-deploy.lock}"
HOTDEAL_LOCK_FILE="${CRAWLER_HOTDEAL_LOCK_FILE:-/tmp/caskbycask-crawler.lock}"
NEWS_LOCK_FILE="${CRAWLER_NEWS_LOCK_FILE:-/tmp/caskbycask-ai-news.lock}"
WINE_LOCK_FILE="${CRAWLER_WINE_LOCK_FILE:-/tmp/caskbycask-wine-crawler.lock}"
LOCK_WAIT_SECONDS="${CRAWLER_LOCK_WAIT_SECONDS:-120}"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
RELEASE_DIR="$BASE_DIR/releases/$RELEASE_ID"
CURRENT_LINK="$BASE_DIR/current"
PREVIOUS_LINK="$BASE_DIR/previous"
VENV_DIR="$RELEASE_DIR/.venv"
SWAPPED=false
DEPLOY_SUCCEEDED=false
CRONTAB_CHANGED=false
HAD_CRONTAB=false
OLD_CURRENT_TARGET=""
CRONTAB_BACKUP="$RELEASE_DIR/.crontab.before"
CRONTAB_NEXT="$RELEASE_DIR/.crontab.next"

rollback_failed_release() {
  status=$?
  trap - EXIT
  if [ "$DEPLOY_SUCCEEDED" = false ]; then
    set +e
    if [ "$SWAPPED" = true ]; then
      if [ -n "$OLD_CURRENT_TARGET" ] && [ -d "$OLD_CURRENT_TARGET" ]; then
        ln -sfnT "$OLD_CURRENT_TARGET" "$CURRENT_LINK"
      else
        rm -f -- "$CURRENT_LINK"
      fi
    fi
    if [ "$CRONTAB_CHANGED" = true ]; then
      if [ "$HAD_CRONTAB" = true ]; then
        crontab "$CRONTAB_BACKUP"
      else
        crontab -r
      fi
    fi
    rm -rf -- "$RELEASE_DIR"
  fi
  exit "$status"
}
trap rollback_failed_release EXIT

exec 6>"$DEPLOY_LOCK_FILE"
if ! flock -n 6; then
  echo "another crawler deployment is already running" >&2
  exit 1
fi

if [ ! -f "$ARCHIVE" ]; then
  echo "crawler archive not found: $ARCHIVE" >&2
  exit 1
fi

if [ -e "$CURRENT_LINK" ] && [ ! -L "$CURRENT_LINK" ]; then
  echo "crawler current path exists but is not a symlink: $CURRENT_LINK" >&2
  echo "Move the legacy directory out of the way before the first release-based deployment." >&2
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

if [ ! -f "$RELEASE_DIR/requirements.lock" ]; then
  echo "crawler requirements.lock is required" >&2
  exit 1
fi

# 각 릴리스가 자체 가상환경을 소유한다. current/previous 링크를 바꾸면 코드와 의존성이 함께 롤백된다.
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" "$RELEASE_DIR/scripts/verify_requirements_lock.py"
PIP_DISABLE_PIP_VERSION_CHECK=1 "$VENV_DIR/bin/python" -m pip install \
  --require-hashes --only-binary=:all: -r "$RELEASE_DIR/requirements.lock"
"$VENV_DIR/bin/python" -m compileall -q -x '/\.venv/' "$RELEASE_DIR"
(
  cd "$RELEASE_DIR"
  "$VENV_DIR/bin/python" -m unittest discover -s tests -p 'test_*.py'
  "$VENV_DIR/bin/python" -c 'import PIL, requests; print(f"crawler deps: requests={requests.__version__}, Pillow={PIL.__version__}")'
)

ln -s "$BASE_DIR/.env" "$RELEASE_DIR/.env"
chmod +x "$RELEASE_DIR/run.sh" "$RELEASE_DIR/run-news.sh" "$RELEASE_DIR/run-wine.sh"

# 실행 중인 구 릴리스가 끝날 때까지 기다린 뒤 두 작업을 모두 잠근 상태에서 교체한다.
exec 8>"$HOTDEAL_LOCK_FILE"
if ! flock -w "$LOCK_WAIT_SECONDS" 8; then
  echo "crawler hot-deal job did not stop within ${LOCK_WAIT_SECONDS}s" >&2
  exit 1
fi
exec 7>"$NEWS_LOCK_FILE"
if ! flock -w "$LOCK_WAIT_SECONDS" 7; then
  echo "crawler news job did not stop within ${LOCK_WAIT_SECONDS}s" >&2
  exit 1
fi
exec 5>"$WINE_LOCK_FILE"
if ! flock -w "$LOCK_WAIT_SECONDS" 5; then
  echo "crawler wine job did not stop within ${LOCK_WAIT_SECONDS}s" >&2
  exit 1
fi

if [ -L "$CURRENT_LINK" ]; then
  OLD_CURRENT_TARGET="$(readlink -f "$CURRENT_LINK")"
fi

if crontab -l > "$CRONTAB_BACKUP" 2>/dev/null; then
  HAD_CRONTAB=true
else
  : > "$CRONTAB_BACKUP"
fi
(
  awk '
    /^# BEGIN CASKBYCASK CRAWLER$/ { managed = 1; next }
    /^# END CASKBYCASK CRAWLER$/ { managed = 0; next }
    managed { next }
    /caskbycask-crawler\/.*\/run(-(news|wine))?\.sh/ { next }
    /caskbycask-crawler\/run(-(news|wine))?\.sh/ { next }
    { print }
  ' "$CRONTAB_BACKUP"
  echo '# BEGIN CASKBYCASK CRAWLER'
  echo 'CRON_TZ=Asia/Seoul'
  echo "0 */2 * * * $CURRENT_LINK/run.sh >> $BASE_DIR/logs/cron.log 2>&1"
  # AI 소식은 매시간 확인만 하고, 실제 수집 주기는 관리자 설정(수집 주기(시간))이 정한다.
  # 차례가 아니면 크롤러가 API 응답을 보고 곧바로 종료한다.
  echo "17 * * * * $CURRENT_LINK/run-news.sh >> $BASE_DIR/logs/ai-news-cron.log 2>&1"
  echo "37 * * * * $CURRENT_LINK/run-wine.sh >> $BASE_DIR/logs/wine-cron.log 2>&1"
  echo '# END CASKBYCASK CRAWLER'
) > "$CRONTAB_NEXT"
crontab "$CRONTAB_NEXT"
CRONTAB_CHANGED=true

if [ -n "$OLD_CURRENT_TARGET" ]; then
  ln -sfnT "$OLD_CURRENT_TARGET" "$PREVIOUS_LINK"
fi
ln -sfnT "$RELEASE_DIR" "$CURRENT_LINK"
SWAPPED=true
CURRENT_TARGET="$(readlink -f "$CURRENT_LINK")"
if [ "$CURRENT_TARGET" != "$RELEASE_DIR" ]; then
  echo "crawler current link verification failed" >&2
  exit 1
fi
DEPLOY_SUCCEEDED=true
trap - EXIT

# current와 previous 두 릴리스만 남긴다. 영속 파일은 releases 밖에 있어 영향받지 않는다.
PREVIOUS_TARGET="$(readlink -f "$PREVIOUS_LINK" 2>/dev/null || true)"
for candidate in "$BASE_DIR"/releases/*; do
  [ -d "$candidate" ] || continue
  candidate_target="$(readlink -f "$candidate" 2>/dev/null || true)"
  if [ -z "$candidate_target" ]; then
    echo "warning: crawler release path could not be resolved: $candidate" >&2
    continue
  fi
  if [ "$candidate_target" != "$CURRENT_TARGET" ] && [ "$candidate_target" != "$PREVIOUS_TARGET" ]; then
    if ! rm -rf -- "$candidate"; then
      echo "warning: old crawler release cleanup failed: $candidate" >&2
    fi
  fi
done

if ! rm -f -- "$CRONTAB_BACKUP" "$CRONTAB_NEXT"; then
  echo "warning: crawler temporary crontab cleanup failed" >&2
fi
if ! rm -f -- "$ARCHIVE"; then
  echo "warning: crawler archive cleanup failed: $ARCHIVE" >&2
fi
echo "crawler deployed: $RELEASE_DIR"
