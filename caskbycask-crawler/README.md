# CaskByCask 핫딜 수집 크롤러 (caskbycask-crawler)

주류(위스키·와인·꼬냑) 커뮤니티의 할인/특가 게시글을 자동 수집해
OpenAI 로 분석하고, CaskByCask 백엔드의 관리자 검토 큐로 보내는 파이썬 크롤러.
**시놀로지 DS220+ 에서 작업 스케줄러로 20분마다 실행**한다.

## 파이프라인
```
스크래퍼(디시·네이버카페) → 제목 1차 키워드 필터 → pending 대기열 저장
 → 최근 딜 fingerprint 중복 제외 → 본문/이미지 수집 → 이미지 임시저장·base64·즉시삭제 → OpenAI 분석
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
| `alerts/slack_notifier.py` | 네이버 카페/API/OpenAI 등 운영 문제 Slack 알림 |
| `scrapers/` | `base_scraper` + `dcinside_scraper` + `naver_cafe_scraper` |
| `filters/keyword_filter.py` | 제목 할인/구매 키워드 1차 필터 |
| `filters/deal_deduplicator.py` | 제목·AI 결과 기반 딜 단위 중복 판정 |
| `analyzer/` | `prompts.py`(프롬프트) + `openai_analyzer.py` |
| `storage/image_handler.py` | 이미지 임시 다운로드→압축→base64→삭제 |
| `uploader/api_uploader.py` | 백엔드 내부 API 업로드 (+수신 계약 명세) |
| `db/seen_posts.py` | 게시글 중복, 분석 대기열, 딜 fingerprint SQLite 스토어 |

## 빠른 시작 (로컬 테스트)
```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # 값 채우기
cp targets.example.json targets.json # 대상 채우기
# .env 의 경로를 로컬용으로 바꾸고, 우선 DRY_RUN=true 로 분석만 확인
python3 main.py
```
> `DRY_RUN=true` 면 백엔드 업로드 없이 분석 결과를 로그로만 출력한다(파이프라인 점검용).

## Slack 운영 알림
`.env`에 `SLACK_WEBHOOK_URL`을 넣으면 아래 문제를 Slack으로 알린다. 비워두면 기존처럼 로그만 남기고 no-op 처리한다.

- 네이버 카페 쿠키 없음/만료, 401/403, 요청 제한(429)
- `CASKBYCASK_INTERNAL_KEY` 불일치로 인한 크롤러 설정 API 또는 업로드 API 인증 실패
- OpenAI API 키 인증 실패, rate limit/quota, 분석 응답 파싱 실패
- 게시글 처리 예외, 실행 종료 시 오류 카운트 요약

같은 실행 안에서는 유형별로 1회만 전송하며, `SLACK_MAX_ALERTS_PER_RUN`으로 실행당 최대 알림 수를 제한한다.

## 백엔드가 구현해야 할 수신 API (크롤러만 구현됨)
`uploader/api_uploader.py` 상단 주석에 계약을 명시했다. 요약:
- `POST /api/internal/deals` · 헤더 `X-Internal-Key`
- 2xx 접수 / 409 중복(멱등, sourceUrl 기준). 저장 시 `is_visible=false, status=PENDING`.
- 요청 본문(flat): `sourceUrl, sourceSite, drinkName, drinkCategory, originalPrice, dealPrice,
  discountRate, currency, seller, dealCondition, expiryInfo, confidenceScore, summaryKo, crawledAt`

자세한 배포 절차는 **[DEPLOY.md](./DEPLOY.md)** 참고.
