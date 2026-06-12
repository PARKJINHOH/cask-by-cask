# 시놀로지 DS220+ 배포 가이드

DS220+ (DSM 7, Intel Celeron J4025 / x86_64) 기준. 크롤러를 20분마다 실행하도록 설정한다.

---

## 0. 사전 준비 체크리스트
- [ ] DSM 7.x 관리자 계정
- [ ] OpenAI API 키 (`sk-...`)
- [ ] 백엔드(Oracle Cloud)에 `DRINKINDEX_INTERNAL_KEY` 설정(크롤러와 동일값) — 수신 API/관리자 화면은 구현 완료(§12)
- [ ] 네이버 카페 로그인 쿠키(NID_AUT/NID_SES), 수집할 카페의 `club_id`/`menu_id`
- [ ] 수집할 디시 갤러리 `board_id`

---

## 1. Python 설치 (DSM 패키지센터)
1. **패키지 센터 → "Python3" 설치** (DSM 7 기본 제공).
2. **제어판 → 터미널 및 SNMP → SSH 서비스 활성화** 체크.
3. PC 에서 SSH 접속:
   ```bash
   ssh <DSM관리자ID>@<NAS_IP>
   sudo -i        # root 권한 (이후 작업 편의를 위해)
   python3 --version   # 3.8+ 확인
   ```

---

## 2. 디렉토리 구성
`.env.example` 의 기본 경로(`/volume1/drinkindex/...`)와 맞춘다.
```bash
mkdir -p /volume1/drinkindex/{logs,temp}
cd /volume1/drinkindex
```
> File Station 으로 공유폴더 `drinkindex` 를 먼저 만들어도 된다.

---

## 3. 코드 업로드
**방법 A — git (NAS 에 git 패키지 설치 시):**
```bash
cd /volume1/drinkindex
git clone <repo-url> repo
cp -r repo/drinkindex-crawler /volume1/drinkindex/drinkindex-crawler
```
**방법 B — File Station 수동 업로드:**
PC 의 `drinkindex-crawler/` 폴더를 통째로 `/volume1/drinkindex/drinkindex-crawler` 로 올린다.
(`.venv`, `__pycache__`, `.env`, `targets.json`, `*.db`, `logs/` 는 올리지 않는다 — `.gitignore` 참고)

---

## 4. 가상환경 + 의존성
```bash
cd /volume1/drinkindex/drinkindex-crawler
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```
> Pillow/Openai 휠은 x86_64 라 바로 설치된다. 혹시 빌드 에러 시
> `pip install --only-binary=:all: -r requirements.txt` 시도.

---

## 5. 환경설정 `.env`
```bash
cp .env.example .env
vi .env      # 또는 File Station 텍스트 에디터
```
필수로 채울 값:
| 키 | 설명 |
|---|---|
| `OPENAI_API_KEY` | OpenAI 키 |
| `DRINKINDEX_API_URL` | 예) `https://api.drinkindex.com` |
| `DRINKINDEX_INTERNAL_KEY` | **백엔드와 동일한** 시크릿(긴 랜덤 문자열) |
| `NAVER_NID_AUT`, `NAVER_NID_SES` | 네이버 로그인 쿠키 (아래 6번) |
| `OPENAI_MODEL` | 분석 모델. 기본 `gpt-4o-mini`, 필요 시 `gpt-4o` 등으로 교체 |
| 경로 4종 | 기본값 그대로면 OK (`/volume1/drinkindex/...`) |

> 우선 `DRY_RUN=true` 로 두고 분석만 확인한 뒤, 정상 동작하면 `false` 로 바꾼다.

### 내부 키 생성 예
```bash
openssl rand -hex 32   # 출력값을 .env 와 백엔드 양쪽에 동일하게 사용
```

### 운영 중 바뀔 수 있는 값 (개발 단계라 자주 변동)
대부분은 **코드 수정 없이 `.env` / `targets.json` 만** 고치면 된다.

| 바뀌는 것 | 어디서 바꾸나 | 코드 수정? |
|---|---|---|
| OpenAI 모델 | `.env` `OPENAI_MODEL` (gpt-4o-mini→gpt-4o 등) | ❌ env |
| OpenAI 호환 게이트웨이 | `.env` `OPENAI_BASE_URL` | ❌ env |
| 백엔드 도메인/주소 | `.env` `DRINKINDEX_API_URL` | ❌ env |
| 시놀로지 경로(db/temp/log/targets) | `.env` `SQLITE_DB_PATH`/`IMAGE_TEMP_DIR`/`LOG_PATH`/`TARGETS_PATH` | ❌ env |
| 수집 대상(갤러리·카페) | `targets.json` | ❌ json |
| 키워드/임계값/딜레이 | `.env` `DEAL_KEYWORDS`/`MIN_CONFIDENCE_SCORE`/`REQUEST_DELAY_SEC` 등 | ❌ env |
| **크롤 대상 사이트 도메인**(gall.dcinside.com / apis.naver.com) | `scrapers/dcinside_scraper.py`·`scrapers/naver_cafe_scraper.py` 상단 URL 상수 | ✅ 코드 |
| 코드 폴더 위치/이름 | 어디 둬도 됨(`run.sh` 가 자기 위치 자동 탐지). cron 명령의 경로만 맞추면 됨 | — |

> 즉 도메인이 바뀌면(디시/네이버가 주소 변경) 해당 스크래퍼 파일 상단 URL 상수만 고친다.
> 그 외 운영값(모델·경로·대상·키워드)은 전부 env/json 으로 무중단 조정된다.

---

## 6. 네이버 카페 인증 쿠키 얻기 (NID_AUT / NID_SES)
프로그램 로그인은 캡차/RSA 로 불안정해, **브라우저 쿠키를 재사용**한다.
1. PC 크롬에서 네이버 로그인.
2. F12 → **Application → Cookies → `https://naver.com`**.
3. `NID_AUT`, `NID_SES` 값을 복사해 `.env` 에 입력.
4. 쿠키는 보통 수 주 유효. 만료 시 카페 수집 로그에 `목록 실패`/`401` 이 보이면
   값을 다시 갱신한다. (장기 운영은 별도 계정 + 주기적 갱신 권장)

### 카페 `club_id` / `menu_id` 찾기
- `club_id`: 카페 접속 후 아무 글의 모바일 URL 또는 페이지 소스에서 `clubid=` 뒤 숫자.
  또는 `https://apis.naver.com/cafe-web/cafe2/CafeInfo.json?cafeUrl=<카페영문주소>` 응답의 `cafeId`.
- `menu_id`: 카페에서 해당 게시판을 누르면 URL 의 `menuid=`(또는 `menuId=`) 뒤 숫자.
  전체글 수집은 `0` 으로 둬도 된다.
- `targets.json` 의 `naver_cafe[]` 에 입력.

---

## 7. 디시 갤러리 `board_id` 찾기
갤러리 URL 의 `id=` 값. 예) `https://gall.dcinside.com/board/lists/?id=whisky` → `whisky`.
마이너 갤러리(`/mgallery/board/lists/?id=alcohol`)는 `targets.json` 에서 `"minor": true` 로 표시한다.
(스크래퍼는 데스크톱 `gall.dcinside.com` 을 파싱한다.)

---

## 8. 수집 대상 `targets.json`
```bash
cp targets.example.json targets.json
vi targets.json
```
디시 `board_id`, 카페 `club_id`/`menu_id`, 페이지 수, 게시판 이름을 채운다.

---

## 9. 수동 1회 실행 (검증)
```bash
cd /volume1/drinkindex/drinkindex-crawler
source .venv/bin/activate
python3 main.py
tail -n 50 /volume1/drinkindex/logs/crawler.log
```
종료 로그의 `후보/신규/분석/업로드/스킵/오류` 카운트로 동작을 확인한다.
- 디시 목록이 0건이면 마크업 변경 가능성 → `scrapers/dcinside_scraper.py` 셀렉터 점검.
- 카페 목록이 0건/`목록 실패` → 쿠키 만료 또는 `club_id/menu_id` 오류.

---

## 10. 작업 스케줄러 등록 (20분마다)
1. `run.sh` 실행권한:
   ```bash
   chmod +x /volume1/drinkindex/drinkindex-crawler/run.sh
   ```
2. **DSM → 제어판 → 작업 스케줄러 → 생성 → 예약된 작업 → 사용자 정의 스크립트**.
3. **일반**: 작업명 `drinkindex-crawler`, 사용자 `root`(또는 폴더 접근 가능한 계정).
4. **일정**: 매일 / 반복 간격 **20분** (DSM 7 은 분 단위 반복 지원: "다음 시간 간격으로 실행" → 20분).
5. **작업 설정 → 사용자 정의 스크립트** (권장 — `flock` 중복실행 방지 + venv 자동 활성화):
   ```bash
   bash /volume1/drinkindex/drinkindex-crawler/run.sh
   ```
   - 폴더를 다른 곳(예: `/volume1/drinkindex/crawler`)에 뒀다면 이 경로만 맞추면 된다.
   - `run.sh` 없이 직접 실행하려면(중복방지·venv 직접 처리 필요):
     ```bash
     cd /volume1/drinkindex/drinkindex-crawler && .venv/bin/python3 main.py >> /volume1/drinkindex/logs/crawler.log 2>&1
     ```
6. 저장 → 작업 선택 → **실행** 으로 즉시 1회 테스트 → 로그 확인.

> `run.sh` 가 `flock` 으로 중복 실행을 막으므로, 한 회차가 20분을 넘겨도 다음 회차와 겹치지 않는다.

---

## 11. 운영 팁 / 트러블슈팅
| 증상 | 점검 |
|---|---|
| 카페 수집 0건 | NID 쿠키 만료 → 6번 재발급. `club_id/menu_id` 확인 |
| 디시 수집 0건 | 데스크톱 마크업/도메인 변경 가능 → `dcinside_scraper.py` 셀렉터(`.gall_tit`/`.write_div`)·URL 상수 점검. 차단 시 `.env` `DCINSIDE_COOKIE` 투입 |
| `업로드 실패 401/403` | `DRINKINDEX_INTERNAL_KEY` 가 백엔드와 일치하는지 |
| OpenAI 비용 급증 | `MAX_NEW_POSTS_PER_RUN`, `MAX_IMAGES_PER_POST` 낮추기 |
| 같은 글 재분석 | `seen_posts.db` 가 유지되는지(경로/권한) 확인 |
| 차단/429 | `REQUEST_DELAY_SEC` 상향(예: 2.0~3.0) |
| 로그 위치 | `/volume1/drinkindex/logs/crawler.log` (5MB×5 회전) |

### 보안
- `.env`, `targets.json`, `*.db` 는 절대 git 에 올리지 않는다(`.gitignore` 처리됨).
- 내부 API 는 `X-Internal-Key` 외에 **백엔드 방화벽/시큐리티에서 `/api/internal/**` 를
  시놀로지 고정 IP 로만 허용**하면 더 안전하다.
- 이미지는 분석 직후 로컬에서 삭제되며 서버에 보관하지 않는다(원격 URL 만 전달).

---

## 12. 백엔드/프론트 (구현 완료 — STEP 12~16)
`drinkindex-api` / `drinkindex-web` 에 이미 구현됨:
1. `domain/deal` — `DealPost` 엔티티 + `DealPostRepository` + Flyway `V25__create_deal_posts.sql`
   (`is_visible`, `status` PENDING/APPROVED/REJECTED, `source_url` UNIQUE 등 전체 필드)
2. `POST /api/internal/deals` (`DealIngestController`) + `InternalKeyAuthFilter`(`X-Internal-Key`)
   - 요청 JSON(flat)은 크롤러 `build_payload()` 와 일치, `source_url` 중복 시 409(멱등)
3. 관리자 API `/api/admin/deals` (목록/상세/승인/반려/수정) + 화면 `/admin/deals`(목록·상세)

### ⚠️ 백엔드에도 환경변수 필요
백엔드 실행 환경(Oracle Cloud)에 **크롤러와 동일한** 키를 설정해야 한다:
```
DRINKINDEX_INTERNAL_KEY=<크롤러 .env 와 같은 값>
```
미설정 시 `/api/internal/**` 은 전부 401(안전 기본값). `application.yml`:
`drinkindex.internal-api-key: ${DRINKINDEX_INTERNAL_KEY:}`
