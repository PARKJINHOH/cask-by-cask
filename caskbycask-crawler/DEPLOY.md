# Oracle Cloud Ubuntu 24.04 배포 가이드

Oracle Cloud (Ubuntu 24.04 LTS, aarch64 또는 x86_64) 운영 서버 기준.
크롤러를 20분마다 실행하도록 cron 스케줄러로 설정한다.

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
크롤러 파일들이 위치할 경로를 `/app` 하위에 생성하고 권한을 `ubuntu` 유저로 설정합니다.
```bash
sudo mkdir -p /app/caskbycask-crawler/{logs,temp}
sudo chown -R ubuntu:ubuntu /app/caskbycask-crawler
cd /app/caskbycask-crawler
```

---

## 3. 코드 업로드 (배치)
로컬 PC의 `caskbycask-crawler/` 폴더 내 파일들을 서버의 `/app/caskbycask-crawler` 디렉토리로 업로드합니다.
(※ `.venv`, `__pycache__`, `.env`, `targets.json`, `*.db`, `logs/` 등은 배포 대상에서 제외합니다 — `.gitignore` 참고)

---

## 4. 가상환경 + 의존성 설치
```bash
cd /app/caskbycask-crawler
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 5. 환경설정 `.env`
```bash
cp .env.example .env
nano .env      # 또는 vi .env
```

필수로 채울 값:
| 키 | 설명 |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio 키. 핫딜·AI 소식·팁 분석·작성·이미지 생성에 공용 사용 |
| `AI_NEWS_GEMINI_FREE_TIER` | 텍스트 무료 티어 사용 여부. 기본 `true` |
| `AI_NEWS_GEMINI_HARD_MONTHLY_USD` | 관리자 설정과 별개의 월 비용 절대 상한 (`0` 비활성) |
| `AI_NEWS_GEMINI_HARD_MONTHLY_TOKENS` | 월 토큰 절대 상한 (`0` 비활성) |
| `AI_NEWS_GEMINI_HARD_MONTHLY_IMAGES` | 월 생성 이미지 절대 상한 (`0` 비활성) |
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
cp targets.example.json targets.json
nano targets.json
```
디시 `board_id`, 카페 `club_id`/`menu_id`, 페이지 수, 게시판 이름을 채운다.

---

## 9. 수동 1회 실행 (검증)
```bash
cd /app/caskbycask-crawler
source .venv/bin/activate
python3 -m json.tool targets.json
python3 main.py
tail -n 50 /app/caskbycask-crawler/logs/crawler.log
```
종료 로그의 `후보/신규/분석/업로드/스킵/오류` 카운트가 정상적으로 기록되는지 확인합니다.

Gemini SDK import 오류나 `httpx` 의존성 오류가 발생하면 가상환경에 현재
`requirements.txt`의 `google-genai==2.11.0`, `httpx==0.28.1` 조합이 반영되도록
아래를 다시 실행합니다.

```bash
python3 -m pip install -r requirements.txt
```

---

## 10. cron 스케줄러 등록 (20분마다)
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
   */20 * * * * /app/caskbycask-crawler/run.sh >> /app/caskbycask-crawler/logs/cron.log 2>&1
   ```
   - `run.sh`가 `flock`을 활용하여 중복 실행을 자체적으로 방지하므로, 이전 회차 수집이 20분을 초과해도 겹쳐서 실행되지 않아 안전합니다.

### AI 소식 작업 추가

`.env`에 `TAVILY_API_KEY`와 `AI_NEWS_*` 모델/비용 설정을 추가한 뒤 별도 잠금 파일을 사용하는
`run-news.sh`를 KST 기준 2시간마다 실행합니다.

```cron
CRON_TZ=Asia/Seoul
17 */2 * * * /app/caskbycask-crawler/current/run-news.sh >> /app/caskbycask-crawler/logs/ai-news-cron.log 2>&1
```

수동 검증:

```bash
/app/caskbycask-crawler/current/run-news.sh
tail -n 100 /app/caskbycask-crawler/logs/ai-news.log
```

GitHub Actions의 `target=crawler` 또는 `target=all`은 새 릴리스를 `/app/caskbycask-crawler/releases/`에
설치한 뒤 `current` 심볼릭 링크를 교체합니다. `.env`, `.venv`, `targets.json`, `*.db`, `logs/`, `temp/`는
릴리스 밖의 영속 경로에 남습니다. 직전 릴리스는 `previous` 링크로 확인할 수 있습니다.

---

## 11. 운영 팁 / 트러블슈팅
| 증상 | 점검 |
|---|---|
| 카페 수집 0건 | NID 쿠키 만료 → 6번 재발급. `club_id/menu_id` 확인 |
| 디시 수집 0건 | 마크업 변경 가능 → `dcinside_scraper.py` 셀렉터·URL 상수 점검 |
| `업로드 실패 401/403` | `CASKBYCASK_INTERNAL_KEY` 가 백엔드(`api.env`)와 정확하게 일치하는지 |
| Slack 알림이 안 옴 | `SLACK_WEBHOOK_URL` 값, Slack Incoming Webhook 앱의 채널 권한, `SLACK_ALERTS_ENABLED=true` 확인 |
| AI 비용 급증 | 핫딜은 `MAX_NEW_POSTS_PER_RUN`, `MAX_IMAGES_PER_POST`, AI 소식은 관리자 월 한도와 `AI_NEWS_GEMINI_HARD_MONTHLY_*` 조정 |
| 같은 딜이 여러 건 올라옴 | `DUPLICATE_LOOKBACK_HOURS` 상향 또는 `DUPLICATE_JACCARD_THRESHOLD`, `DUPLICATE_NGRAM_THRESHOLD` 하향 |
| 핫딜 AI 429 | `GEMINI_REQUEST_INTERVAL_SEC` 확인 또는 상향 (기본 5초) |
| AI 소식 Gemini 429 | Google AI Studio 프로젝트의 무료 티어 rate limit 확인. 다음 2시간 실행을 기다리거나 후보 수를 낮춤 |
| 크롤링 차단/429 | `REQUEST_DELAY_SEC` 상향 (예: 2.0~3.0) |
| 로그 위치 | `/app/caskbycask-crawler/logs/crawler.log` |

### 보안
- `.env`, `targets.json`, `seen_posts.db`는 절대 git에 올리지 않는다 (`.gitignore` 처리됨).
- Nginx에 IP 화이트리스트 차단 등을 적용하지 않았더라도 `CASKBYCASK_INTERNAL_KEY`를 통한 인증 토큰(`X-Internal-Key`) 검증이 이루어지므로 안전하며, `CASKBYCASK_API_URL`을 로컬 호스트(`http://127.0.0.1:8080`)로 사용하면 외부로 트래픽이 노출되지 않아 한층 더 안전합니다.
- 이미지는 분석 직후 로컬에서 삭제되며 서버에 보관하지 않는다 (원격 URL 만 백엔드로 전달).

