# 시놀로지 DS220+ 배포 가이드

DS220+ (DSM 7, Intel Celeron J4025 / x86_64) 기준. 크롤러를 20분마다 실행하도록 설정한다.

---

## 0. 사전 준비 체크리스트
- [ ] DSM 7.x 관리자 계정
- [ ] OpenAI API 키 (`sk-...`)
- [ ] 백엔드(Oracle Cloud) 가 `/api/internal/hotdeals` 수신 API + `X-Internal-Api-Key` 검증을 구현했는지
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
| 경로 4종 | 기본값 그대로면 OK (`/volume1/drinkindex/...`) |

> 우선 `DRY_RUN=true` 로 두고 분석만 확인한 뒤, 정상 동작하면 `false` 로 바꾼다.

### 내부 키 생성 예
```bash
openssl rand -hex 32   # 출력값을 .env 와 백엔드 양쪽에 동일하게 사용
```

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
갤러리 URL 의 `id=` 값. 예) `https://gall.dcinside.com/board/lists/?id=whiskey` → `whiskey`.
마이너 갤러리도 모바일 경로(`m.dcinside.com/board/<id>`)는 동일하게 동작한다.

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
5. **작업 설정 → 사용자 정의 스크립트**:
   ```bash
   bash /volume1/drinkindex/drinkindex-crawler/run.sh
   ```
6. 저장 → 작업 선택 → **실행** 으로 즉시 1회 테스트 → 로그 확인.

> `run.sh` 가 `flock` 으로 중복 실행을 막으므로, 한 회차가 20분을 넘겨도 다음 회차와 겹치지 않는다.

---

## 11. 운영 팁 / 트러블슈팅
| 증상 | 점검 |
|---|---|
| 카페 수집 0건 | NID 쿠키 만료 → 6번 재발급. `club_id/menu_id` 확인 |
| 디시 수집 0건 | 모바일 마크업 변경 가능 → 셀렉터(`.subjectin` 등) 갱신 |
| `업로드 실패 401/403` | `DRINKINDEX_INTERNAL_KEY` 가 백엔드와 일치하는지 |
| OpenAI 비용 급증 | `MAX_NEW_POSTS_PER_RUN`, `MAX_IMAGES_PER_POST` 낮추기 |
| 같은 글 재분석 | `seen_posts.db` 가 유지되는지(경로/권한) 확인 |
| 차단/429 | `REQUEST_DELAY_SEC` 상향(예: 2.0~3.0) |
| 로그 위치 | `/volume1/drinkindex/logs/crawler.log` (5MB×5 회전) |

### 보안
- `.env`, `targets.json`, `*.db` 는 절대 git 에 올리지 않는다(`.gitignore` 처리됨).
- 내부 API 는 `X-Internal-Api-Key` 외에 **백엔드 방화벽/시큐리티에서 `/api/internal/**` 를
  시놀로지 고정 IP 로만 허용**하면 더 안전하다.
- 이미지는 분석 직후 로컬에서 삭제되며 서버에 보관하지 않는다(원격 URL 만 전달).

---

## 12. 백엔드 측 할 일 (이 크롤러와 별개, 다음 작업)
`drinkindex-api` 에 추가 필요:
1. `domain/hotdeal` (Entity/Repository/Service/DTO) + Flyway `V{n}__hotdeal.sql`
   (`is_visible`, `status` PENDING/APPROVED/REJECTED, `source_post_id` UNIQUE 등)
2. `POST /api/internal/hotdeals` 컨트롤러 + `X-Internal-Api-Key` 검증 필터(또는 시큐리티 룰)
   - 요청 JSON 형식은 `uploader/api_uploader.py` 의 `build_payload()` 와 일치
   - `source_post_id` 중복 시 409 반환(멱등)
3. 관리자 검토 화면(목록/상세/승인·반려) — 프론트 `drinkindex-web/admin`
