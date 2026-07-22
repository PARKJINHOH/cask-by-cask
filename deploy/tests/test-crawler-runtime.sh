#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf -- "$TMP_DIR"; }
trap cleanup EXIT

mkdir -p "$TMP_DIR/bin" "$TMP_DIR/source/caskbycask-crawler/scripts" \
  "$TMP_DIR/source/caskbycask-crawler/tests" "$TMP_DIR/base/releases/old"
cp "$ROOT_DIR/caskbycask-crawler/run.sh" "$TMP_DIR/source/caskbycask-crawler/run.sh"
cp "$ROOT_DIR/caskbycask-crawler/run-news.sh" "$TMP_DIR/source/caskbycask-crawler/run-news.sh"
touch "$TMP_DIR/source/caskbycask-crawler/requirements.lock" \
  "$TMP_DIR/source/caskbycask-crawler/requirements.txt" \
  "$TMP_DIR/source/caskbycask-crawler/main.py" \
  "$TMP_DIR/source/caskbycask-crawler/news_main.py" \
  "$TMP_DIR/source/caskbycask-crawler/scripts/verify_requirements_lock.py"
touch "$TMP_DIR/base/.env"
ln -s "$TMP_DIR/base/releases/old" "$TMP_DIR/base/current"

create_archive() {
  tar -czf "$TMP_DIR/crawler.tar.gz" -C "$TMP_DIR/source" caskbycask-crawler
}

cat > "$TMP_DIR/bin/python3" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" = "-m" ] && [ "${2:-}" = "venv" ]; then
  mkdir -p "$3/bin"
  cat > "$3/bin/python" <<'PYTHON'
#!/usr/bin/env bash
exit 0
PYTHON
  chmod +x "$3/bin/python"
  exit 0
fi
echo "unexpected python3 invocation: $*" >&2
exit 2
MOCK
chmod +x "$TMP_DIR/bin/python3"

cat > "$TMP_DIR/bin/crontab" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  -l)
    [ -f "$FAKE_CRONTAB_STATE" ] || exit 1
    cat "$FAKE_CRONTAB_STATE"
    ;;
  -r)
    rm -f -- "$FAKE_CRONTAB_STATE"
    ;;
  *)
    if [ "${FAKE_CRONTAB_FAIL_ONCE:-false}" = true ] && [ ! -e "$FAKE_CRONTAB_FAILURE_MARKER" ]; then
      touch "$FAKE_CRONTAB_FAILURE_MARKER"
      exit 42
    fi
    cp "$1" "$FAKE_CRONTAB_STATE"
    ;;
esac
MOCK
chmod +x "$TMP_DIR/bin/crontab"

HAVE_REAL_FLOCK=true
if ! command -v flock >/dev/null 2>&1; then
  HAVE_REAL_FLOCK=false
  cat > "$TMP_DIR/bin/flock" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK
  chmod +x "$TMP_DIR/bin/flock"
fi

export FAKE_CRONTAB_STATE="$TMP_DIR/crontab.state"
export FAKE_CRONTAB_FAILURE_MARKER="$TMP_DIR/crontab.failed"
export FAKE_CRONTAB_FAIL_ONCE=true
printf '%s\n' 'CRON_TZ=UTC' '5 1 * * * /app/unrelated-job.sh' > "$FAKE_CRONTAB_STATE"

export CRAWLER_BASE_DIR="$TMP_DIR/base"
export CRAWLER_ARCHIVE="$TMP_DIR/crawler.tar.gz"
export CRAWLER_DEPLOY_LOCK_FILE="$TMP_DIR/deploy.lock"
export CRAWLER_HOTDEAL_LOCK_FILE="$TMP_DIR/hotdeal.lock"
export CRAWLER_NEWS_LOCK_FILE="$TMP_DIR/news.lock"
export CRAWLER_LOCK_WAIT_SECONDS=1

# Windows Git Bash는 ln -s를 일반 파일 복사로 에뮬레이션할 수 있어 릴리스 교체 테스트를
# 실행할 수 없다. 실제 배포와 CI의 Linux에서는 항상 이 블록을 실행한다.
if [ -L "$TMP_DIR/base/current" ]; then
  # crontab 설치 실패 시 current와 기존 crontab을 그대로 보존해야 한다.
  create_archive
  set +e
  PATH="$TMP_DIR/bin:$PATH" bash "$ROOT_DIR/deploy/server/deploy-crawler.sh" >/dev/null 2>&1
  status=$?
  set -e
  [ "$status" -ne 0 ] || { echo "crawler deploy unexpectedly succeeded" >&2; exit 1; }
  [ "$(readlink -f "$TMP_DIR/base/current")" = "$TMP_DIR/base/releases/old" ]
  grep -Fq '/app/unrelated-job.sh' "$FAKE_CRONTAB_STATE"
  [ "$(find "$TMP_DIR/base/releases" -mindepth 1 -maxdepth 1 -type d | wc -l)" -eq 1 ]

  # 같은 아카이브를 다시 실행하면 릴리스와 가상환경을 함께 교체한다.
  PATH="$TMP_DIR/bin:$PATH" bash "$ROOT_DIR/deploy/server/deploy-crawler.sh" >/dev/null
  new_current="$(readlink -f "$TMP_DIR/base/current")"
  [ "$new_current" != "$TMP_DIR/base/releases/old" ]
  [ "$(readlink -f "$TMP_DIR/base/previous")" = "$TMP_DIR/base/releases/old" ]
  grep -Fq "$TMP_DIR/base/current/run.sh" "$FAKE_CRONTAB_STATE"
  [ "$(grep -c '^CRON_TZ=UTC$' "$FAKE_CRONTAB_STATE")" -eq 1 ]
  [ "$(grep -c '^# BEGIN CASKBYCASK CRAWLER$' "$FAKE_CRONTAB_STATE")" -eq 1 ]
  [ ! -e "$TMP_DIR/crawler.tar.gz" ]

  # 실제 flock이 있는 Linux에서는 실행 중 작업과 swap 경합도 검증한다.
  if [ "$HAVE_REAL_FLOCK" = true ]; then
    create_archive
    (
      exec 9>"$CRAWLER_HOTDEAL_LOCK_FILE"
      flock -x 9
      touch "$TMP_DIR/hotdeal.locked"
      sleep 3
    ) &
    holder=$!
    for _ in 1 2 3 4 5; do
      [ -e "$TMP_DIR/hotdeal.locked" ] && break
      sleep 0.1
    done
    set +e
    PATH="$TMP_DIR/bin:$PATH" bash "$ROOT_DIR/deploy/server/deploy-crawler.sh" >/dev/null 2>&1
    status=$?
    set -e
    wait "$holder"
    [ "$status" -ne 0 ] || { echo "crawler deploy ignored an active job lock" >&2; exit 1; }
    [ "$(readlink -f "$TMP_DIR/base/current")" = "$new_current" ]
  fi
else
  echo "crawler release swap tests skipped: native symlinks unavailable"
fi

# 릴리스 venv가 없으면 system Python으로 우회하지 않고 즉시 실패한다.
mkdir -p "$TMP_DIR/wrapper"
cp "$ROOT_DIR/caskbycask-crawler/run.sh" "$TMP_DIR/wrapper/run.sh"
cp "$ROOT_DIR/caskbycask-crawler/run-news.sh" "$TMP_DIR/wrapper/run-news.sh"
for wrapper in run.sh run-news.sh; do
  if PATH="$TMP_DIR/bin:$PATH" bash "$TMP_DIR/wrapper/$wrapper" >/dev/null 2>&1; then
    echo "$wrapper accepted a missing release venv" >&2
    exit 1
  fi
done

echo "crawler release wrapper tests passed"
