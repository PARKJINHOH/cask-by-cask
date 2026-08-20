# CaskByCask 핫딜 수집 크롤러 (caskbycask-crawler)

주류(위스키·와인·꼬냑) 커뮤니티의 할인/특가 게시글을 자동 수집해
Google Gemini로 분석하고, CaskByCask 백엔드의 관리자 검토 큐로 보내는 파이썬 크롤러.
운영 Oracle Cloud에서 핫딜 수집은 KST 기준 2시간마다 실행한다.

같은 프로젝트의 `news_main.py`는 커뮤니티 소식용 AI 자동화 진입점이다. 핫딜 작업과 상태를 공유하지 않으며
Oracle Cloud에서 `run-news.sh`를 2시간마다 실행한다.

## AI 소식 소재 수집

**AI 는 기사를 쓰지 않는다.** 등록 출처에서 쓸 만한 사건을 찾아 제목·요약·근거 URL 만 저장하고,
본문과 이미지는 관리자가 직접 만든다.

```text
관리자가 등록한 공식 홈페이지·공식 SNS URL 직접 확인
  + 등록 도메인으로 제한한 Tavily 검색 (실행당 1크레딧, 주종 하나에 집중)
  → Gemini 분류기가 제목·요약 생성
  → 정규화 URL·이벤트 키·공유 출처로 중복 확인
  → /api/internal/ai-news/leads 제출
  → 백엔드가 본문 없이 검토 대기로 저장
  → 관리자가 근거를 읽고 본문·이미지를 만들어 직접 발행
```

- 2시간마다 **등록 출처 안에서만** 검색한다. 실행마다 주종 하나에 집중하며(관리자 설정의
  주종 비율이 순환 비중이다), 서버 설정 기본값은 하루 3건 **수집**이다.
- 수집 대상은 신제품 출시·공개·국내 수입, 이벤트(시음회·팝업·페어), 어워드·수상 결과다.
  리뉴얼·단종·가격 변동 같은 기존 제품 변경 소식은 제외한다.
- 팁·정보 글은 **AI 가 만들지 않는다.** 관리자가 `소식(AI) > 직접 작성`에서 쓰고,
  `정보 주제` 탭은 잊지 않으려고 적어 두는 '쓸 거리' 메모다.
- 핫딜은 짝수 시각 정각(`0 */2 * * *`), AI 소식은 같은 짝수 시각 17분(`17 */2 * * *`)에 실행해 Gemini 호출이 겹치지 않게 한다.
- **자동 발행, AI 본문 작성, AI 이미지 생성을 모두 하지 않는다.**
- `관리자 > 커뮤니티 > 소식(AI)`에서 자동화·출처·쓸 거리·사용량을 관리한다.
- 출처 관리의 활성화된 `공식`·`전문매체` URL은 매 실행 때 확인하며, 성공/실패 결과와 오류를 관리자 목록에 기록한다. 일반 웹사이트의 일시적인 연결 실패는 재시도하고, Instagram처럼 서버 직접 수집이 제한된 플랫폼은 Tavily 제한 검색으로만 확인한다. 제한 검색이 정상 완료되고 신규 결과가 없는 경우도 출처 확인은 성공으로 기록하되 소재 근거는 추가하지 않는다.
- 네이버 카페·디시인사이드 핫딜 대상은 별도 `targets.json`이 소유하며 AI 소식 출처 관리와 공유하지 않는다.
- 첫 배포는 `automationEnabled=false`이다.
- 필수 추가 환경변수는 `TAVILY_API_KEY`, `GEMINI_API_KEY`이며 모델과 비용·토큰 절대 상한은 `.env.example`을 참고한다.
- 모델은 소재 선별·제목·요약용 `gemini-3.1-flash-lite` 하나뿐이다. 텍스트 무료 티어를 쓰면 `AI_NEWS_GEMINI_FREE_TIER=true`로 둔다.

## 파이프라인
```
스크래퍼(디시·네이버카페) → 제목 1차 키워드 필터 → pending 대기열 저장
 → 최근 딜 fingerprint 중복 제외 → 본문/이미지 수집 → 이미지 임시저장·base64·즉시삭제 → Gemini 분석
 → AI 정규화 fingerprint 중복 제외
 → is_deal & confidence_score 통과분만 백엔드 업로드(is_visible=false, PENDING) → 관리자 검토
```

## 디렉토리
| 경로 | 역할 |
|---|---|
| `main.py` | 오케스트레이터(엔트리포인트) |
| `config.py` | `.env` + `targets.json` 로딩 |
| `models.py` | 스테이지 간 타입드 데이터 계약 |
| `logger.py` | 회전 파일 + 콘솔 로깅 |
| `alerts/slack_notifier.py` | 네이버 카페/API/Gemini 등 운영 문제 Slack 알림 |
| `scrapers/` | `base_scraper` + `dcinside_scraper` + `naver_cafe_scraper` |
| `filters/keyword_filter.py` | 제목 할인/구매 키워드 1차 필터 |
| `filters/deal_deduplicator.py` | 제목·AI 결과 기반 딜 단위 중복 판정 |
| `filters/deal_policy.py` | AI 분석 후 업로드 정책(카테고리, 복합 할인 제외, 가격/할인율 정규화) |
| `analyzer/` | `prompts.py`(프롬프트) + `gemini_analyzer.py` |
| `storage/image_handler.py` | 이미지 임시 다운로드→압축→base64→삭제 |
| `uploader/api_uploader.py` | 백엔드 내부 API 업로드 (+수신 계약 명세) |
| `db/seen_posts.py` | 게시글 중복, 분석 대기열, 딜 fingerprint SQLite 스토어 |

## 빠른 시작 (로컬 테스트)
```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m unittest discover -s tests -p "test_*.py"
cp .env.example .env                 # 값 채우기
cp targets.example.json targets.json # 대상 채우기
# .env 의 경로를 로컬용으로 바꾸고, 우선 DRY_RUN=true 로 분석만 확인
python3 main.py
```

운영 배포는 개발용 설치와 달리 커밋된 `requirements.lock`의 버전·hash를 검증하고,
릴리스별 독립 `.venv`를 만든 뒤 테스트가 통과해야만 `current`를 교체합니다.
> `DRY_RUN=true` 면 백엔드 업로드 없이 분석 결과를 로그로만 출력한다(파이프라인 점검용).

## Slack 운영 알림
`.env`에 `SLACK_WEBHOOK_URL`을 넣으면 아래 문제를 Slack으로 알린다. 비워두면 기존처럼 로그만 남기고 no-op 처리한다.

- 네이버 카페 쿠키 없음/만료, 401/403, 요청 제한(429)
- `CASKBYCASK_INTERNAL_KEY` 불일치로 인한 크롤러 설정 API 또는 업로드 API 인증 실패
- Gemini API 키 인증 실패, rate limit/quota, 분석 응답 파싱 실패
- 게시글 처리 예외, 실행 종료 시 오류 카운트 요약

같은 실행 안에서는 유형별로 1회만 전송하며, `SLACK_MAX_ALERTS_PER_RUN`으로 실행당 최대 알림 수를 제한한다.

## 와인 빈티지 수집

`wine_main.py`는 관리자에서 만든 실행 요청을 가져와 와인 마스터와 빈티지를 `HIDDEN`으로 등록한다.
실행 유형은 두 가지다. `FIXTURE`는 외부 통신 없이 번들 샘플 3건만 재생하는 오프라인 점검용이고,
`MANUAL`/`SCHEDULED`는 공개 Vivino HTML을 읽는 웹 크롤러다.

- API URL·토큰·로그인 쿠키는 사용하지 않는다. 공개 카탈로그/상세 HTML만 수집한다.
- Vivino 측 조건은 과도한 호출을 하지 않는 것이다. 요청 간격은 `VIVINO_REQUEST_DELAY_SECONDS`(최소 1초, 기본 5초),
  실행당 탐색 페이지는 `VIVINO_DISCOVERY_PAGE_LIMIT`, 와인 상세 처리량은 실행당·시간당 최대 10건으로 제한한다.
- 후보 시작 페이지는 `VIVINO_START_URLS`로 지정한다.
- 로그인, CAPTCHA, bot challenge, 401/403/429를 우회하지 않고 실행 또는 건별 실패와 Slack 알림으로 남긴다.
- 대표 이미지·평점/평가 수·산지·필수 맛 지표까지 확보되지 않은 후보는 부분 등록하지 않고 실패로 남긴다.
- 영문명은 Vivino 원문을 그대로 사용한다. 국문명 자동 검색·음차는 하지 않으며 관리자 검수 화면에서 수동 입력 후 공개한다.
- 외부 와인 ID/빈티지 ID를 먼저 비교하고, 없을 때는 생산자·영문명·빈티지 조합 해시로 다시 검사해 중복은 `PASS` 처리한다.
- 수집 후보 부족, 필수 필드 누락, 저장 오류는 영문 와인명·원문 링크·사유와 함께 Slack으로 알린다.
- 와이너리는 필수값이 아니다. 미확인이면 생산자 없이 비공개 저장하고 관리자 검수에서 연결한다.

로컬에서는 API를 실행한 뒤 `관리자 > 주류 > 와인 크롤링`에서 `오프라인 테스트 3건`을 누르고 다음 명령을 실행한다.

```bash
python wine_main.py
```

운영 cron은 `run-wine.sh`를 매시 37분에 호출한다. 관리자 설정의 `자동 수집`이 꺼져 있으면 새 예약 실행을
만들지 않고, 관리자가 수동으로 요청한 실행만 처리한다.

## 백엔드가 구현해야 할 수신 API (크롤러만 구현됨)
`uploader/api_uploader.py` 상단 주석에 계약을 명시했다. 요약:
- `POST /api/internal/deals` · 헤더 `X-Internal-Key`
- 2xx 접수 / 409 중복(멱등, sourceUrl 기준). 저장 시 `is_visible=false, status=PENDING`.
- 요청 본문(flat): `sourceUrl, sourceSite, drinkName, drinkCategory, volumeMl, originalPrice, dealPrice,
  discountRate, currency, seller, dealCondition, expiryInfo, confidenceScore, summaryKo, crawledAt`
- 업로드 전 `filters/deal_policy.py`에서 정상가/할인가가 모두 있는 단순 단품 딜만 통과시키며,
  빈 가격은 `0`, 할인율은 `(originalPrice - dealPrice) / originalPrice`로 재계산한다.
- `volumeMl`은 병 1개 기준이다. `700ml`, `70cl`, `0.7L`는 모두 `700`으로 정규화하고,
  여러 용량 옵션이나 범위 표기는 추측하지 않고 `null`로 보내 관리자 확인 대상으로 남긴다.

자세한 배포 절차는 **[DEPLOY.md](./DEPLOY.md)** 참고.
