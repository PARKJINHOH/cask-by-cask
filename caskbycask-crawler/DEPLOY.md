# Oracle Cloud Ubuntu 24.04 배포 가이드

Oracle Cloud (Ubuntu 24.04 LTS, aarch64 또는 x86_64) 운영 서버 기준.
핫딜 크롤러는 KST 기준 2시간마다, AI 소식 크롤러는 매시간 시차를 두고 실행하도록 cron 스케줄러로 설정한다.
AI 소식의 실제 수집 주기는 관리자 화면 설정이 정하고, cron 은 "지금 차례인가"를 확인하는 역할만 한다.

---

## 0. 사전 준비 체크리스트
- [ ] Google AI Studio Gemini API 키 (핫딜·AI 소식·팁 공용)
- [ ] 백엔드(Oracle Cloud)의 `api.env`에 `CASKBYCASK_INTERNAL_KEY` 설정(크롤러와 동일값)
- [ ] 네이버 카페 로그인 쿠키(NID_AUT/NID_SES), 수집할 카페의 `club_id`/`menu_id`
- [ ] 수집할 디시 갤러리 `board_id`
- [ ] (선택) Slack Incoming Webhook URL (`SLACK_WEBHOOK_URL`)

---

## 1. 패키지 설치
Ubuntu 24.04 LTS 환경에서는 Python 3.12가 기본 설치되어 있으므로, 가상환경 구성을 위한 `python3-venv` 패키지만 추가로 설치합니다.
```bash
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip
```

---

## 2. 디렉토리 구성
릴리스 코드와 영속 설정·로그를 분리할 경로를 만들고 `ubuntu` 유저로 설정합니다.
```bash
sudo mkdir -p /app/caskbycask-crawler/{releases,logs,temp}
sudo chown -R ubuntu:ubuntu /app/caskbycask-crawler
```

---

## 3. 영속 설정 준비

소스 전체를 `/app/caskbycask-crawler` 루트에 직접 업로드하지 않습니다. 이 경로에는 배포와
무관하게 유지되는 `.env`, `targets.json`, `*.db`, `logs/`, `temp/`만 둡니다. 개발 PC에서
`.env.example`과 `targets.example.json`을 `~/setup/`에 올린 뒤 최초 한 번만 설치합니다.

```bash
install -m 600 ~/setup/crawler.env.example /app/caskbycask-crawler/.env
install -m 600 ~/setup/targets.example.json /app/caskbycask-crawler/targets.json
nano /app/caskbycask-crawler/.env
nano /app/caskbycask-crawler/targets.json
```

---

## 4. 첫 릴리스 배포와 의존성 lock 검증

운영 배포는 `requirements.lock`만 사용하며 모든 전이 의존성의 버전과 배포 파일 hash를
검증합니다. 공용 가상환경을 수동 갱신하지 않습니다.

GitHub Actions의 crawler gate와 `deploy-crawler.sh`가 Linux ARM64/Python 3.12에서
`pip --require-hashes --only-binary=:all:`로 설치한 뒤 전체 단위 테스트를 실행합니다.
새 릴리스마다 `releases/<release-id>/.venv`를 따로 만들므로 `current`/`previous` 전환 시
소스와 의존성이 함께 전환됩니다. Actions에서 `target=crawler` 또는 `target=all`을 실행한 뒤
다음 명령으로 결과를 확인합니다.

```bash
readlink -f /app/caskbycask-crawler/current
/app/caskbycask-crawler/current/.venv/bin/python \
  /app/caskbycask-crawler/current/scripts/verify_requirements_lock.py
```

### 의존성 변경 시 lock 재생성(개발 PC)

`requirements.txt`의 직접 의존성을 변경한 PR에서만 아래 명령을 실행합니다.

```bash
python -m pip install "uv==0.11.29"
uv pip compile requirements.txt \
  --python-version 3.12 \
  --python-platform aarch64-manylinux_2_28 \
  --only-binary :all: \
  --generate-hashes \
  --output-file requirements.lock
python scripts/verify_requirements_lock.py
```

생성된 `requirements.lock`을 반드시 같이 반영하고 임의로 손편집하지 않습니다.

---

## 5. 환경설정 `.env`
```bash
nano /app/caskbycask-crawler/.env
```

필수로 채울 값:
| 키 | 설명 |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio 키. 핫딜 분석과 AI 소식 소재 선별에 공용 사용 |
| `AI_NEWS_GEMINI_FREE_TIER` | 텍스트 무료 티어 사용 여부. 기본 `true` |
| `AI_NEWS_GEMINI_HARD_MONTHLY_USD` | 관리자 설정과 별개의 월 비용 절대 상한 (`0` 비활성) |
| `AI_NEWS_GEMINI_HARD_MONTHLY_TOKENS` | 월 토큰 절대 상한 (`0` 비활성) |
| `CASKBYCASK_API_URL` | `http://127.0.0.1:8080` (API가 같은 서버에 있으므로 로컬 호출 권장) |
| `CASKBYCASK_INTERNAL_KEY` | **백엔드와 동일한** 시크릿(긴 랜덤 문자열) |
| `NAVER_NID_AUT`, `NAVER_NID_SES` | 네이버 로그인 쿠키 (아래 6번) |
| `GEMINI_MODEL` | 핫딜 분석 모델. 기본 `gemini-3.1-flash-lite` |
| `GEMINI_REQUEST_INTERVAL_SEC` | 핫딜 AI API 호출 시작 간격. 무료 티어 보호용 기본 `5`초 |
| `ALLOWED_DEAL_CATEGORIES` | 업로드 허용 주류 카테고리. 기본 `WHISKY,COGNAC,WINE,TEQUILA,RUM` |
| `MAX_AI_ANALYSIS_PER_RUN` | 1회 실행에서 AI 분석까지 진행할 최대 건수. 초과분은 DB 대기열로 이월 |
| `DUPLICATE_LOOKBACK_HOURS` | 같은 딜 fingerprint 를 비교할 최근 시간 범위. 기본 `72`시간 |
| `DUPLICATE_JACCARD_THRESHOLD`, `DUPLICATE_NGRAM_THRESHOLD` | 로컬 제목 유사도 기준. 기본 `0.58`, `0.62` |
| `SLACK_WEBHOOK_URL` | 선택. 네이버 카페/API/Gemini 문제를 Slack으로 알림 |
| `SLACK_CHANNEL` | 선택. 기본 `#server-prd` |

경로 설정 (Ubuntu 서버 경로에 맞춤):
```properties
SQLITE_DB_PATH=/app/caskbycask-crawler/seen_posts.db
IMAGE_TEMP_DIR=/app/caskbycask-crawler/temp
LOG_PATH=/app/caskbycask-crawler/logs/crawler.log
TARGETS_PATH=/app/caskbycask-crawler/targets.json
```

> 우선 `DRY_RUN=true` 로 두고 분석만 확인한 뒤, 정상 동작하면 `false` 로 바꾼다.
> Slack 알림은 `SLACK_WEBHOOK_URL` 이 비어 있으면 자동 비활성화된다.

### 내부 키 생성 예
```bash
openssl rand -hex 32   # 출력값을 .env 와 백엔드(api.env) 양쪽에 동일하게 사용
```

---

## 6. 네이버 카페 인증 쿠키 얻기 (NID_AUT / NID_SES)
프로그램 로그인은 캡차/RSA 로 불안정해, **브라우저 쿠키를 재사용**한다.
1. PC 크롬에서 네이버 로그인.
2. F12 → **Application → Cookies → `https://naver.com`**.
3. `NID_AUT`, `NID_SES` 값을 복사해 `.env` 에 입력.
4. 쿠키는 보통 수 주 유효. 만료 시 카페 수집 로그에 `목록 실패`/`401` 이 보이면 값을 다시 갱신한다.

### 카페 `club_id` / `menu_id` 찾기
- **최신 URL 형식인 경우** (예: `https://cafe.naver.com/f-e/cafes/14538121/menus/0?viewType=L`):
  - `cafes/` 뒤의 숫자 **`14538121`**이 `club_id`가 됩니다.
  - `menus/` 뒤의 숫자 **`0`**이 `menu_id`가 됩니다 (0은 보통 전체글 보기).
- **일반 모바일/PC URL인 경우**:
  - `club_id`: 카페 접속 후 아무 글이나 눌렀을 때 모바일 URL 또는 페이지 소스에서 `clubid=` 뒤에 나오는 숫자.
  - `menu_id`: 카페 내에서 특정 게시판을 선택했을 때 URL의 `menuid=`(또는 `menuId=`) 뒤에 나오는 숫자.
- `targets.json` 의 `naver_cafe[]` 에 입력.

---

## 7. 디시 갤러리 `board_id` 찾기
갤러리 URL 의 `id=` 값입니다.
- **위스키 마이너 갤러리 예시**: `https://gall.dcinside.com/mgallery/board/lists/?id=whiskey`
  - `id=` 뒤의 **`whiskey`**가 `board_id`가 됩니다.
  - URL 경로에 `mgallery`가 들어가므로 `targets.json`에서 `"minor": true` 옵션을 켜야 합니다.
- 메이저 갤러리는 URL 경로가 `/board/lists/`이고, `"minor": false` 를 사용합니다.


---

## 8. 수집 대상 `targets.json`
```bash
nano /app/caskbycask-crawler/targets.json
```
디시 `board_id`, 카페 `club_id`/`menu_id`, 페이지 수, 게시판 이름을 채운다.

---

## 9. 수동 1회 실행 (검증)
```bash
cd /app/caskbycask-crawler
/app/caskbycask-crawler/current/.venv/bin/python -m json.tool targets.json
/app/caskbycask-crawler/current/.venv/bin/python /app/caskbycask-crawler/current/main.py
tail -n 50 /app/caskbycask-crawler/logs/crawler.log
```
종료 로그의 `후보/신규/분석/업로드/스킵/오류` 카운트가 정상적으로 기록되는지 확인합니다.

Gemini SDK import 오류나 `httpx` 의존성 오류가 발생하면 운영 가상환경을 직접 수정하지 말고
현재 릴리스의 lock 정합성과 설치 버전을 확인합니다.

```bash
/app/caskbycask-crawler/current/.venv/bin/python \
  /app/caskbycask-crawler/current/scripts/verify_requirements_lock.py
/app/caskbycask-crawler/current/.venv/bin/python -c \
  'import PIL, requests; print(requests.__version__, PIL.__version__)'
```

불일치나 import 오류가 있으면 해당 릴리스를 재배포하거나 `previous`로 롤백합니다.

---

## 10. cron 스케줄러 등록 (핫딜 2시간마다 · AI 소식 매시간)
1. `run.sh` 실행권한 부여:
   ```bash
   chmod +x /app/caskbycask-crawler/run.sh
   ```
2. 배포 유저(`ubuntu`)의 crontab 수정:
   ```bash
   crontab -e
   ```
3. 아래의 내용을 crontab 파일 하단에 추가합니다:
   ```text
   CRON_TZ=Asia/Seoul
   0 */2 * * * /app/caskbycask-crawler/current/run.sh >> /app/caskbycask-crawler/logs/cron.log 2>&1
   ```
   - `run.sh`가 `flock`을 활용하여 중복 실행을 자체적으로 방지하므로, 이전 회차 수집이 2시간을 초과해도 겹쳐서 실행되지 않습니다.

### AI 소식 작업 추가

`.env`에 `TAVILY_API_KEY`와 `AI_NEWS_*` 모델/비용 설정을 추가한 뒤 별도 잠금 파일을 사용하는
`run-news.sh`는 핫딜 실행 17분 후에 시작하도록 **매시간** 실행합니다. 두 작업은 서로 다른 잠금 파일을 사용하지만 Gemini 무료 한도의 순간 중첩을 피하기 위해 시차를 둡니다.

```cron
CRON_TZ=Asia/Seoul
17 * * * * /app/caskbycask-crawler/current/run-news.sh >> /app/caskbycask-crawler/logs/ai-news-cron.log 2>&1
```

**cron 주기와 수집 주기는 다릅니다.** cron 은 매시간 깨어나기만 하고, 실제로 수집할지는
`관리자 > 커뮤니티 > 소식(AI) > 설정·사용량`의 **수집 주기(시간)** 가 정합니다(기본 2시간).
크롤러는 `/api/internal/ai-news/config` 의 `collectionDue` 를 보고 차례가 아니면 실행 이력을 만들지 않고
그대로 종료합니다 — 그래서 주기를 바꾸려고 서버에 접속할 필요가 없습니다.

AI 소식은 **소재만 모읍니다.** 크롤러는 제목·요약·근거 URL 까지만 저장하고, 본문과 대표 이미지는
관리자가 에디터에서 직접 만들어 발행합니다. AI 본문 작성과 Gemini 이미지 API 는 호출하지 않습니다.

수동 검증:

```bash
/app/caskbycask-crawler/current/run-news.sh
tail -n 100 /app/caskbycask-crawler/logs/ai-news.log
```

GitHub Actions의 `target=crawler` 또는 `target=all`은 새 릴리스를 `/app/caskbycask-crawler/releases/`에
설치한 뒤 lock/hash 검증, 컴파일, 전체 테스트가 모두 성공한 경우에만 `current` 심볼릭 링크를
교체합니다. `.env`, `targets.json`, `*.db`, `logs/`, `temp/`는 릴리스 밖의 영속 경로에 남고,
각 `.venv`는 해당 릴리스 안에 포함됩니다. 교체 전 두 작업의 `flock`을 기다리고 cron 갱신이
실패하면 기존 릴리스를 유지합니다. 직전 코드와 가상환경은 `previous` 링크로 함께 롤백됩니다.
실행 래퍼는 릴리스 `.venv/bin/python`이 없으면 시스템 Python으로 우회하지 않고 실패합니다.

```bash
# 수동 롤백도 두 작업 lock을 모두 잡은 상태에서 코드와 .venv를 함께 전환
(
  flock -w 120 8 || exit 1
  flock -w 120 7 || exit 1
  target="$(readlink -f /app/caskbycask-crawler/previous)"
  test -x "$target/.venv/bin/python"
  ln -sfnT "$target" /app/caskbycask-crawler/current
) 8>/tmp/caskbycask-crawler.lock 7>/tmp/caskbycask-ai-news.lock 5>/tmp/caskbycask-wine-crawler.lock
```

---

## 11. 운영 팁 / 트러블슈팅
| 증상 | 점검 |
|---|---|
| 카페 수집 0건 | NID 쿠키 만료 → 6번 재발급. `club_id/menu_id` 확인 |
| 디시 수집 0건 | 마크업 변경 가능 → `dcinside_scraper.py` 셀렉터·URL 상수 점검 |
| `업로드 실패 401/403` | `CASKBYCASK_INTERNAL_KEY` 가 백엔드(`api.env`)와 정확하게 일치하는지 |
| Slack 알림이 안 옴 | `SLACK_WEBHOOK_URL` 값, Slack Incoming Webhook 앱의 채널 권한, `SLACK_ALERTS_ENABLED=true` 확인 |
| AI 비용 급증 | 핫딜은 `MAX_NEW_POSTS_PER_RUN`, `MAX_IMAGES_PER_POST`, AI 소식은 관리자 월 한도와 `AI_NEWS_GEMINI_HARD_MONTHLY_*` 조정 |
| AI 소식 출처가 이상함 | 관리자 `소식(AI) > 출처 관리`에서 등록 출처를 직접 손본다. 수집은 등록 출처 밖으로 나가지 않는다 |
| 같은 딜이 여러 건 올라옴 | `DUPLICATE_LOOKBACK_HOURS` 상향 또는 `DUPLICATE_JACCARD_THRESHOLD`, `DUPLICATE_NGRAM_THRESHOLD` 하향 |
| 핫딜 AI 429 | `GEMINI_REQUEST_INTERVAL_SEC` 확인 또는 상향 (기본 5초) |
| AI 소식 Gemini 429 | Google AI Studio 프로젝트의 무료 티어 rate limit 확인. 다음 2시간 실행을 기다리거나 후보 수를 낮춤 |
| AI 소식 소재가 안 쌓임 | ① 관리자 `소식(AI) > 설정`의 자동화 ON 여부 — OFF면 `ai-news.log`에 `AI 소식 자동화가 관리자 설정에서 비활성화` 만 남고 즉시 종료한다. ② **수집 주기(시간)** 차례가 아니면(`collectionDue=false`) 실행 이력조차 남기지 않으므로 cron 이 매시간 돌아도 정상이다. ③ 일일 상한 소진과 Tavily·Gemini 월 한도 도달 Slack 경고 |
| 크롤링 차단/429 | `REQUEST_DELAY_SEC` 상향 (예: 2.0~3.0) |
| 로그 위치 | `/app/caskbycask-crawler/logs/crawler.log` |

### 보안
- `.env`, `targets.json`, `seen_posts.db`는 절대 git에 올리지 않는다 (`.gitignore` 처리됨).
- Nginx에 IP 화이트리스트 차단 등을 적용하지 않았더라도 `CASKBYCASK_INTERNAL_KEY`를 통한 인증 토큰(`X-Internal-Key`) 검증이 이루어지므로 안전하며, `CASKBYCASK_API_URL`을 로컬 호스트(`http://127.0.0.1:8080`)로 사용하면 외부로 트래픽이 노출되지 않아 한층 더 안전합니다.
- 이미지는 분석 직후 로컬에서 삭제되며 서버에 보관하지 않는다 (원격 URL 만 백엔드로 전달).
- 외부 이미지 요청은 HTTP(S) 기본 80/443, 공개 DNS/IP만 허용하고 각 리디렉션을 다시 검사합니다. 검증한 IP로 실제 연결을 고정하되 원래 Host/SNI로 인증서를 검증해 DNS rebinding을 막습니다. 환경 proxy와 `.netrc` 자격증명은 사용하지 않습니다.
- DNS·응답 헤더와 본문에는 총시간 제한을 적용해 slow-drip 응답이 작업을 장기간 점유하지 못하게 합니다.
- 이미지 본문은 JPEG/PNG/WebP/GIF 실제 포맷, 2천만 픽셀, 60프레임, 10MB 제한을 통과해야 Pillow가 디코딩합니다.

---

## 12. 와인 빈티지 수집 배포

와인 작업은 기존 핫딜·AI 소식 작업과 분리된 `run-wine.sh`와 lock을 사용한다. 필수 값은
`CASKBYCASK_API_URL`과 `CASKBYCASK_INTERNAL_KEY`뿐이고 핫딜 크롤러와 공유하므로,
**와인 전용 `.env` 추가 없이도 동작한다.** 아래 값은 수집 강도를 조정할 때만 넣는다.

```properties
WINE_FIXTURE_PATH=/app/caskbycask-crawler/current/fixtures/wine_license_review.json
VIVINO_BASE_URL=https://www.vivino.com
VIVINO_START_URLS=https://www.vivino.com/explore
# 요청 간격·페이지 상한. Vivino 측 요청 조건이 "한 번에 과도하게 호출하지 않을 것"이므로
# 값을 낮출 때는 신중히 조정한다. 코드가 1초 미만 간격은 허용하지 않는다.
VIVINO_REQUEST_DELAY_SECONDS=5
VIVINO_REQUEST_TIMEOUT_SECONDS=20
VIVINO_DISCOVERY_PAGE_LIMIT=3
VIVINO_MAX_HTML_BYTES=4194304
# 비우면 일반 브라우저 User-Agent를 쓴다. 식별용 문자열을 넣어도 된다.
VIVINO_CRAWLER_USER_AGENT=
```

관리자 화면에서 오프라인 테스트 실행을 만든 뒤 수동 검증:

```bash
/app/caskbycask-crawler/current/run-wine.sh
tail -n 100 /app/caskbycask-crawler/logs/wine-cron.log
```

배포 스크립트가 관리하는 cron:

```cron
CRON_TZ=Asia/Seoul
37 * * * * /app/caskbycask-crawler/current/run-wine.sh >> /app/caskbycask-crawler/logs/wine-cron.log 2>&1
```

관리자 설정의 `자동 수집`이 꺼져 있으면 cron은 예약 실행을 만들지 않는다. 수동 실행은 자동 수집 상태와
무관하게 언제든 가능하다. 수집은 API 토큰이나 로그인 쿠키를 사용하지 않으며,
401/403/429·CAPTCHA·bot challenge를 우회하지 않고 그 회차를 중단한다.

