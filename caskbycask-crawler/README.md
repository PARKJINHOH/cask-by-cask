# CaskByCask 핫딜 수집 크롤러 (caskbycask-crawler)

주류(위스키·와인·꼬냑) 커뮤니티의 할인/특가 게시글을 자동 수집해
Google Gemini로 분석하고, CaskByCask 백엔드의 관리자 검토 큐로 보내는 파이썬 크롤러.
운영 Oracle Cloud에서 핫딜 수집은 KST 기준 2시간마다 실행한다.

같은 프로젝트의 `news_main.py`는 커뮤니티 소식용 AI 자동화 진입점이다. 핫딜 작업과 상태를 공유하지 않으며
Oracle Cloud에서 `run-news.sh`를 2시간마다 실행한다.

## AI 소식·팁 자동화

```text
Tavily 일반 검색 + 관리자가 등록한 공식 홈페이지·공식 SNS URL 직접 확인
  + 등록 도메인으로 제한한 Tavily 검색
  → Gemini 후보 분류/정규화 URL·이벤트 키 중복 확인
  → 근거 기반 한국어 원고 작성
  → 팁은 과거 제목·소제목·동의어·의미 지문 전체 비교와 최종 AI 중복 판정
  → 승인 공식 이미지를 우선 사용하고 없으면 비브랜드 AI 대표 이미지 생성
  → /api/internal/ai-news/articles 제출
  → 백엔드가 출처 신뢰도·90% 기준·일일 한도·48시간 주기를 재검증
```

- 출시 소식은 2시간마다 검색하며 서버 설정 기본값은 하루 3건이다.
- 팁 및 정보 글은 마지막 성공 발행 48시간 후 다음 주제를 작성한다.
- 핫딜은 짝수 시각 정각(`0 */2 * * *`), AI 소식·팁은 같은 짝수 시각 17분(`17 */2 * * *`)에 실행해 Gemini 호출이 겹치지 않게 한다.
- AI 이미지 생성은 기본 비활성화다. `AI_NEWS_IMAGE_GENERATION_ENABLED=false`이면 이미지 API를 호출하지 않고 원고를 검토 대기로 저장한다.
- `관리자 > 커뮤니티 > 소식(AI)`에서 자동화·드라이런·출처·주제·사용량을 관리한다.
- 출처 관리의 활성화된 `공식`·`전문매체` URL은 매 실행 때 확인하며, 성공/실패 결과와 오류를 관리자 목록에 기록한다. 일반 웹사이트의 일시적인 연결 실패는 재시도하고, Instagram처럼 서버 직접 수집이 제한된 플랫폼은 Tavily 제한 검색으로만 확인한다. 제한 검색이 정상 완료되고 신규 결과가 없는 경우도 출처 확인은 성공으로 기록하되 원고 근거는 추가하지 않는다.
- 네이버 카페·디시인사이드 핫딜 대상은 별도 `targets.json`이 소유하며 AI 소식 출처 관리와 공유하지 않는다.
- 첫 배포는 `automationEnabled=false`, `autoPublishEnabled=false`, `dryRun=true`이다.
- 필수 추가 환경변수는 `TAVILY_API_KEY`, `GEMINI_API_KEY`이며 모델과 비용·토큰·이미지 절대 상한은 `.env.example`을 참고한다.
- 기본 모델은 분류·중복판정 `gemini-3.1-flash-lite`, 최종 원고 `gemini-3.5-flash`, 이미지 `gemini-3.1-flash-lite-image`다. 텍스트 무료 티어를 쓰면 `AI_NEWS_GEMINI_FREE_TIER=true`로 두며, 이미지 생성은 무료 티어가 없어 별도 결제가 필요하다.

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
