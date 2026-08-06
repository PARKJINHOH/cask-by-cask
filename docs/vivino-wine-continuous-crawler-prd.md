# Vivino 와인 지속 수집 크롤러 PRD

- 문서 상태: 구현 전 검토안
- 작성일: 2026-08-06
- 관련 문서: `docs/wine-vintage-vivino-ingestion-prd.md`
- 관리자 운영 화면: `docs/admin-wine-crawler-page-prd.md`
- 대상: `caskbycask-crawler`, `caskbycask-api`, `caskbycask-web`, 운영 배포 문서
- 운영 전제: 운영 DB에는 현재 와인 데이터가 없고 위스키·꼬냑 데이터는 존재함
- 권한 전제: Vivino 정식 라이선스는 추후 취득 예정

## 1. 결론

크롤러는 지금부터 구현할 수 있지만, 실행 모드를 아래 두 개로 완전히 분리한다.

1. **라이선스 검토 데모 모드**
   - 로컬에서만 사용한다.
   - 누적 등록을 최대 3개 빈티지로 제한한다.
   - 합성 fixture 또는 Vivino가 이메일로 명시적으로 승인·제공한 샘플만 사용한다.
   - 실제 Vivino 사이트에 자동 접속하지 않는다.
   - 등록 상태는 무조건 `HIDDEN`이며 사용자 공개를 금지한다.
   - 화면에는 `라이선스 검토용 데모` 표식을 보이고, 정식 로고 대신 승인 전 placeholder를 쓴다.
2. **정식 지속 수집 모드**
   - Vivino가 허가한 API, feed, export 또는 계약상 명시된 접근 방식만 사용한다.
   - 시간당 최대 10개 빈티지 후보를 무작위로 처리한다.
   - 공급자 ID, 정규화 키, DB 제약을 순서대로 검사해 확정 중복은 `PASS`한다.
   - 수집 실패는 와인명, Vivino 링크, 사유를 Slack으로 알린다.
   - 허가 식별자, 허용 필드, 이미지·점수·로고 사용권 중 하나라도 불명확하면 fail-closed한다.

현재 [Vivino 이용약관](https://www.vivino.com/en/legal/terms-of-service)은 승인 없는 scraper,
crawler, bot 접근을 금지하고 별도 서면 합의 없는 사업 목적 이용도 제한한다. 따라서 “허가를 받기 위해
우선 실제 사이트에서 3건을 자동 수집”하는 방식은 채택하지 않는다. 먼저 합성 데이터 화면과 이 문서의
데이터 사용 명세를 보내거나, Vivino에 **최대 3건의 비공개 PoC 수집을 이메일로 사전 승인**받은 뒤
승인된 샘플만 데모 모드에 투입한다.

Vivino 평점과 로고도 [상표·평점 라이선스 문서](https://www.vivino.com/vivino_trademark_license_agreement-online.pdf)의
범위에 들어간다. 공식 문의 페이지가 Ratings·Branding 문의처로 안내하는
`retailprogram@vivino.com`에 접근 방식과 필드별 사용 범위를 함께 확인한다.

> 이 PRD의 권한 게이트는 기술적 안전 기준이며 법률 자문이 아니다. 실제 허용 범위는 Vivino의
> 서면 답변과 계약서가 최종 기준이다.

## 2. 이 PRD가 다루는 범위

### 2.1 목표

- 허가된 Vivino 카탈로그에서 아직 등록하지 않은 와인 빈티지를 지속적으로 발견한다.
- 매시 최대 10개 후보만 무작위 선택해 상세 수집·국내명 보강·등록을 시도한다.
- 하나의 와인 마스터 아래 연도 빈티지 또는 NV 자식을 멱등하게 등록한다.
- 같은 후보가 다시 발견되어도 새 `Spirit`를 만들지 않고 `DUPLICATE_PASS`로 종료한다.
- 영어 와인명과 생산자를 기준으로 신뢰 가능한 국내 한글명을 찾아 출처를 남긴다.
- 필수 정보가 Vivino와 허용된 국내 원천 모두에 없으면 등록하지 않는다.
- 실패 후보는 와인명, 빈티지, 원문 링크, 사유, 재시도 여부를 Slack으로 알린다.
- 외부 평점은 CaskByCask 사용자 평점과 분리해 저장·표시한다.
- 한 후보의 실패가 나머지 후보 처리를 중단시키지 않게 한다.

### 2.2 비목표

- 공개 HTML, 비공개 API, 모바일 앱 API, GraphQL endpoint를 역분석하는 구현
- 로그인 우회, CAPTCHA 우회, 프록시 회전, User-Agent 위장, rate limit 회피
- Vivino 사용자 리뷰 본문, 사용자명, 프로필 등 개인정보 수집
- 출처가 없는 한글명·생산자·산지·맛 값을 AI로 추측 생성
- 이미지 파일 자체에 Vivino 로고나 점수를 합성
- 외부 평점을 CaskByCask `avgScore`, 랭킹, 추천 점수에 합산
- 중복으로 판정한 기존 수동 데이터를 무조건 자동 덮어쓰기
- 수집 실패를 보충하려고 같은 시간대에 10건을 초과 처리

## 3. 현재 애플리케이션과의 연결

기존 분석 결과는 `docs/wine-vintage-vivino-ingestion-prd.md`를 따른다.

- 와인 단건용 `spirit.vintage_year`와 `spirit_wine_detail.vintage_status`는 이미 있다.
- 현재 관리자 폼은 단일 와인의 빈티지/NV만 입력할 수 있다.
- 기존 위스키 에디션 구조인 `parent_id`, `variant_type`, `variant_value`를 와인 빈티지에 확장한다.
- `CreateVariantRequest`와 저장 서비스는 현재 자식 위스키 상세만 처리하므로 와인 상세 저장을 추가해야 한다.
- 사용자 리뷰 폼의 에디션 select를 와인 빈티지 select로 재사용한다.
- 기존 크롤러에는 Python 실행기, SQLite 상태 저장, 내부 API 인증, cron, `flock`, Slack 알림이 있다.
- 현재 `SlackNotifier.warning_once()`는 한 실행 안에서만 중복 알림을 막는다. 시간대가 바뀌어도 같은
  실패를 반복 발송하지 않으려면 와인 후보 저장소에 `last_alerted_at`과 `last_alert_key`를 추가해야 한다.

이 문서는 기존 PRD의 와인 도메인·UI 설계를 변경하지 않고, 지속 수집·중복·실패 처리 부분을 상세화한다.

## 4. 실행 모드와 권한 게이트

### 4.1 공통 모드

| 모드 | 공급자 | 네트워크 | 등록 상한 | 저장 상태 | 공개 배지 |
|---|---|---:|---:|---|---|
| `FIXTURE_DRY_RUN` | 합성 fixture | 없음 | 저장 없음 | 저장 없음 | 없음 |
| `LICENSE_REVIEW_DEMO` | fixture 또는 승인 샘플 | Vivino 접근 없음 | 누적 3건 | `HIDDEN` | placeholder만 |
| `LICENSED_SANDBOX` | 계약상 sandbox | 허가 범위만 | 실행당 1~3건 | `HIDDEN` | 계약 허용 시만 |
| `LICENSED_PRODUCTION` | 공식 API/feed/export | 허가 범위만 | 시간당 10건 | 초기 `HIDDEN` | 별도 flag |

`LICENSE_REVIEW_DEMO`의 누적 3건은 프로세스 메모리가 아니라 DB 또는 SQLite의 영속 카운터로 강제한다.
프로세스를 재시작하거나 fixture 파일명을 바꿔도 네 번째 등록은 `DEMO_LIMIT_REACHED`로 차단한다.

### 4.2 정식 provider 시작 조건

다음 값이 모두 유효해야 `VivinoLicensedProvider`가 네트워크 요청을 시작한다.

- `WINE_CRAWLER_MODE=LICENSED_SANDBOX` 또는 `LICENSED_PRODUCTION`
- `VIVINO_USAGE_GRANT_REF`: 계약/이메일 승인 식별자
- `VIVINO_ACCESS_METHOD`: 계약에 명시된 `API`, `FEED`, `EXPORT` 중 하나
- 접근 credential 또는 허가된 파일 위치
- `VIVINO_ALLOWED_FIELDS`: 수집 허용 필드 allowlist
- `VIVINO_RATING_USAGE_ALLOWED`
- `VIVINO_LOGO_USAGE_ALLOWED`
- `VIVINO_IMAGE_USAGE_ALLOWED`
- 허가된 요청량·캐시 기간·갱신 주기

하나라도 없으면 시작 전에 종료하고 Slack에 `VIVINO_AUTHORIZATION_INCOMPLETE`를 한 번 알린다.
설정이 없다고 공개 웹 페이지로 fallback하지 않는다.

### 4.3 3건 라이선스 검토 데모

권장 절차는 다음과 같다.

1. 합성 fixture 3건으로 관리자·사용자 화면을 완성한다.
2. 대표 이미지 우측 하단에는 `VIVINO 승인 후 표시 · 4.2` 같은 회색 placeholder를 쓴다.
3. 화면 캡처와 함께 “실제로 사용할 필드 목록, 표시 위치, 캐시 기간, 원문 링크 방식”을 Vivino에 보낸다.
4. 실제 데이터가 필요한 경우 최대 3개 제품/빈티지의 비공개 PoC 사용 승인을 먼저 이메일로 받는다.
5. Vivino가 파일·sandbox·샘플 응답을 제공하면 `approved_sample_provider`로 로컬 HIDDEN 등록한다.
6. 이 데이터와 캡처는 Vivino 검토 외 목적으로 공개하거나 재배포하지 않는다.
7. 정식 계약의 필드 범위가 달라지면 데모 레코드를 삭제 또는 재수집하고 운영 데이터로 승격하지 않는다.

데모 화면 하단에는 다음 문구를 관리자에게만 표시한다.

```text
라이선스 검토용 로컬 데모입니다. 실제 Vivino 데이터·로고의 공개 사용을 허용하지 않습니다.
```

## 5. 지속 수집 아키텍처

```text
허가된 Catalog/API/Feed
        │
        ▼
Discovery Adapter ──▶ Candidate Queue
                          │
                          ▼
                시간당 무작위 최대 10건
                          │
                          ▼
                  Detail/Vintage Fetch
                          │
                          ▼
                    Normalize + Provenance
                          │
               ┌──────────┴──────────┐
               ▼                     ▼
          Duplicate Gate        Korean Enrichment
               │                     │
       PASS / ATTACH / ALERT          ▼
                               Required-field Gate
                                      │
                             READY / RETRY / REJECTED
                                      │
                                      ▼
                              Internal Import API
                                      │
                         CREATED / UPDATED / PASS / CONFLICT
                                      │
                                      ▼
                            Run Summary + Slack Alert
```

### 5.1 모듈 구조

```text
caskbycask-crawler/
  wine_main.py
  wine_config.py
  wine_models.py
  wine_scheduler.py
  wine_providers/
    base.py
    fixture_provider.py
    approved_sample_provider.py
    vivino_licensed_provider.py
  wine_enrichment/
    korean_name_resolver.py
    field_fallback_resolver.py
    match_policy.py
  wine_dedupe/
    canonicalizer.py
    duplicate_gate.py
  wine_storage/
    candidate_store.py
    demo_quota_store.py
  alerts/
    wine_error_alert.py
    slack_notifier.py
  uploader/
    wine_api.py
  fixtures/wine/
  run-wine.sh
```

`vivino_licensed_provider.py`는 계약 문서의 공식 schema가 확정되기 전에는 interface와 fail-closed
검증만 구현한다. HTML selector나 추정 endpoint는 코드에 넣지 않는다.

### 5.2 Provider interface

```python
class WineCatalogProvider(Protocol):
    def authorization(self) -> UsageGrant: ...
    def discover(self, cursor: str | None, limit: int) -> DiscoveryPage: ...
    def fetch_product(self, external_wine_id: str) -> ProviderWine: ...
    def fetch_vintage(self, external_vintage_id: str) -> ProviderVintage: ...
    def fetch_authorized_image(self, image_ref: str) -> AuthorizedImage | None: ...
```

모든 provider 응답에는 다음이 포함되어야 한다.

- 공급자와 외부 제품/빈티지 ID
- canonical source URL
- 조회 시각
- 필드별 출처와 사용 허가 범위
- 원본 schema/version
- 다음 discovery cursor

## 6. 후보 상태와 상태 전이

```text
DISCOVERED
  ├─▶ SELECTED ─▶ FETCHING ─▶ ENRICHING ─▶ READY ─▶ IMPORTING ─▶ IMPORTED
  │                  │             │           │          ├─▶ DUPLICATE_PASS
  │                  │             │           │          └─▶ CONFLICT
  │                  │             │           └─▶ REJECTED
  │                  │             └─▶ RETRY
  │                  └─▶ RETRY
  └─▶ DUPLICATE_PASS
```

| 상태 | 의미 | 다음 실행 대상 |
|---|---|---|
| `DISCOVERED` | ID·링크·기본명만 확보 | 예 |
| `SELECTED` | 해당 시간대 처리 대상으로 예약 | 현재 실행 |
| `FETCHING` | 허가된 상세 조회 중 | lease 만료 시 회수 |
| `ENRICHING` | 한글명·fallback 확인 중 | lease 만료 시 회수 |
| `READY` | 필수값과 출처 검증 완료 | 현재/다음 실행 |
| `IMPORTING` | 내부 API 요청 중 | lease 만료 시 확인 후 회수 |
| `IMPORTED` | 생성 또는 안전한 갱신 완료 | 신규 등록 대상 아님 |
| `DUPLICATE_PASS` | 확정 중복, 정상 종료 | 아니오 |
| `RETRY` | 일시 장애, `next_retry_at` 이후 재시도 | 조건부 |
| `REJECTED` | 영구 누락·권한 부족·불일치 | 아니오 |
| `CONFLICT` | 중복 가능성이 있으나 자동 판정 불가 | 관리자 확인 후 |

프로세스가 중간 종료되면 `lease_until`이 지난 `SELECTED/FETCHING/ENRICHING/IMPORTING` 후보를
다음 실행이 회수한다. 내부 API 멱등키가 마지막 방어선이므로 재요청해도 중복 생성되지 않는다.

## 7. 시간당 최대 10건과 무작위 선택

### 7.1 상한의 정의

- cron은 KST 매시 37분 `37 * * *`에 실행한다.
- 한 시간대에 `SELECTED`로 바꾸는 신규/재시도 빈티지 후보 합계는 최대 10건이다.
- 상세 수집 실패가 발생해도 같은 실행에서 다른 후보로 보충해 10건을 넘기지 않는다.
- 따라서 등록 성공은 항상 시간당 10건 이하이고, 상세 처리 시도도 시간당 10건 이하이다.
- 제품 마스터와 첫 빈티지를 함께 만들면 빈티지 후보 1건으로 센다.
- discovery가 계약상 요청량에 포함되면 별도의 provider request counter로 전체 계약 한도도 강제한다.
- 점수 갱신 작업은 신규 등록과 큐를 분리하며, 계약 한도를 공유한다.

### 7.2 후보 선택 알고리즘

1. 현재 시간대의 quota ledger를 연다. 이미 실행한 횟수를 빼고 잔여량을 계산한다.
2. `next_retry_at <= now`인 `RETRY`를 전체의 최대 20%, 최대 2건까지 우선 배정한다.
3. 나머지는 `DISCOVERED` 중 아직 최종 상태가 아닌 후보에서 무작위 선택한다.
4. 한 생산자·국가·와인 종류가 한 실행의 40%를 넘지 않도록 층화한다.
5. 7일 이상 선택되지 않은 후보는 starvation 방지를 위해 가중치를 높인다.
6. 실행 seed와 선택된 candidate ID를 저장해 장애 분석 시 같은 표본을 재현한다.
7. `flock` 잠금을 얻지 못하면 다른 실행이 동작 중인 것이므로 정상 종료하고 quota를 쓰지 않는다.

무작위성은 DB의 `ORDER BY RAND()`에 의존하지 않는다. 후보 ID 범위를 페이지로 읽고 Python의
seeded reservoir/weighted sampling을 사용해 대량 데이터에서도 전체 정렬 비용을 피한다.

### 7.3 Discovery cursor

- 공급자가 제공하는 공식 cursor 또는 feed sequence를 그대로 저장한다.
- cursor가 끝에 도달하면 계약상 full rescan이 허용된 경우에만 처음으로 되돌린다.
- full rescan에서도 기존 external ID는 후보 row를 갱신할 뿐 새 row를 만들지 않는다.
- 한 discovery page가 실패하면 이전 cursor를 보존해 데이터가 조용히 누락되지 않게 한다.
- catalog gap이 감지되면 해당 와인을 Slack에 알릴 수 없으므로 provider 단위
  `DISCOVERY_GAP_DETECTED` 경고를 보내고 마지막 정상 cursor를 포함한다.

## 8. 중복 판정과 `PASS` 정책

중복은 낮은 비용·높은 확실성 순서로 검사한다. 확정 중복만 자동 `PASS`하고, 애매한 경우는
새 데이터 생성을 막은 뒤 `CONFLICT`로 알린다.

### 8.1 정규화 규칙

`canonicalizer.py`는 다음 값을 만든다.

- `normalized_producer`: 생산자 stable ID 우선, 없으면 영문명 Unicode NFKC·소문자·공백 정리
- `normalized_base_name_en`: 영문 제품명에서 맨 끝의 연도 또는 NV 표기만 제거
- `normalized_cuvee`: 제품 구분에 필요한 cuvée, vineyard, reserve 표기는 보존
- `vintage_key`: `VINTAGE:2022` 또는 `NV`
- `canonical_source_url`: fragment와 추적 query 제거, 공급자가 정의한 canonical URL 사용
- `external_key`: 빈티지 ID가 있으면 그 값을 쓰고, 없으면 `externalWineId:vintageKey`로 구성
- `wine_identity_key`: SHA-256(`producerId|normalizedBaseNameEn|normalizedCuvee|vintageKey`)

정규화 시 제거하는 것:

- 대소문자 차이, 연속 공백, 일반적인 구두점 차이
- 이름 끝의 중복 빈티지 표기
- URL의 추적 파라미터와 fragment

정규화 시 제거하지 않는 것:

- 생산자명
- cuvée, vineyard, reserve, appellation처럼 제품을 구분하는 단어
- 빈티지 연도와 NV 구분
- 와인 색상/종류를 구분하는 이름 요소

용량과 포장 형태는 현재 `Spirit`가 SKU를 모델링하지 않으므로 중복 identity에서 제외한다. 같은
와인의 750ml와 매그넘을 별도 `Spirit`로 만들지 않는다. 추후 SKU 기능이 생기면 별도 하위 모델로 확장한다.

### 8.2 판정 단계

| 순서 | 검사 | 결과 |
|---:|---|---|
| 1 | `(provider, external_vintage_id)`가 candidate/external reference에 존재 | `DUPLICATE_EXTERNAL_ID` PASS |
| 2 | canonical source URL과 `vintage_key`가 기존 reference와 동일 | `DUPLICATE_SOURCE_URL` PASS |
| 3 | `wine_identity_key`가 기존 빈티지 자식과 동일 | `DUPLICATE_IDENTITY` PASS 또는 reference 연결 |
| 4 | 같은 생산자 + 정규화 영문명 + 같은 빈티지의 강한 단일 수동 데이터 match | 새 Spirit 없이 reference 연결 후 `DUPLICATE_MANUAL_MATCH` PASS |
| 5 | 비슷한 후보가 2개 이상이거나 생산자/빈티지 일부 불일치 | `DUPLICATE_AMBIGUOUS` CONFLICT |
| 6 | 저장 순간 DB unique 충돌 | 재조회해 동일 대상이면 PASS, 다른 대상이면 CONFLICT |

### 8.3 PASS 후 동작

- 새 `Spirit`, `spirit_wine_detail`, 이미지 파일을 생성하지 않는다.
- 같은 external ID가 같은 `spirit_id`에 연결된 경우 점수·평가 수·수집 시각처럼 계약이 허용한
  동적 필드만 갱신할 수 있다.
- 관리자가 수정한 `nameKo`, 설명, 산지, 대표 이미지는 자동 덮어쓰지 않는다.
- `wine_ingest_candidate.status = DUPLICATE_PASS`와 `pass_code`, `matched_spirit_id`를 저장한다.
- 실행 통계의 `duplicatePassCount`를 증가시킨다.
- 확정 중복 PASS는 실패가 아니므로 와인별 Slack을 보내지 않는다.
- 실행 요약에는 `중복 PASS N건`만 표시한다.

### 8.4 NV와 경계 사례

- 같은 마스터의 NV는 기본적으로 하나만 허용한다.
- 이름·공급자 제품 ID가 다른 distinct cuvée는 둘 다 NV여도 별도 마스터 또는 별도 제품으로 본다.
- 같은 제품의 2021과 2022는 중복이 아니다.
- 생산자가 다르면 이름이 같아도 중복이 아니다.
- 동일 생산자의 이름 변경/리브랜딩은 자동 병합하지 않고 `CONFLICT`로 보낸다.
- 영문명의 철자 차이가 fuzzy threshold만 넘는 경우 자동 PASS하지 않는다.
- 한글명만 같은 경우 중복 근거로 사용하지 않는다.

## 9. 국내 한글명과 필수 데이터 보강

### 9.1 한글명 우선순위

1. 국내 공식 수입사 또는 생산자 한국 공식 페이지
2. 데일리샷
3. 와인나라
4. 와인12닷컴
5. 엑스와인

각 adapter는 해당 사이트의 이용조건·robots·허가를 확인한 경우에만 활성화한다. 검색 결과 snippet은
후보 발견에 사용할 수 있지만, 최종 한글명 근거 URL과 본문 일치 확인이 필요하다.

매칭 필수 조건:

- 영문 제품명 정규화 일치
- 생산자 일치
- 빈티지 상세를 사용할 경우 연도 일치
- 다른 cuvée, 세트, 글라스 포함 상품, 다른 제품을 제외

한글 제품명만 확보하는 경우 저장되는 `nameKo`에는 연도/NV를 넣지 않는다. 화면 helper가 빈티지를 붙인다.
후보가 없거나 복수 후보가 동점이면 음차 생성하지 않고 각각 `KOREAN_NAME_NOT_FOUND`,
`KOREAN_MATCH_AMBIGUOUS`로 등록을 중단한다.

### 9.2 필수 데이터

- 공급자 제품 ID와 빈티지 ID
- canonical Vivino 링크
- 영문 제품명, 검증된 한글 제품명
- 생산자 영문/한글명
- 국가, 최소 L1 산지, 와인 종류
- 빈티지 상태와 연도 또는 NV
- 도수와 용량
- 외부 점수, 평가 수, 수집 기준 시각
- 제공되는 맛 축의 원본 값과 내부 5단계 변환값
- 사용 허가가 확인된 대표 이미지
- 필드별 출처 URL과 사용 허가 참조

선택값은 토양, 고도, 더 깊은 산지, 발효 용기, 오크 정보, 설명이다. 선택값이 없다는 이유로 전체 등록을
막지 않는다. 특정 와인 유형에서 공식적으로 제공하지 않는 맛 축은 `NOT_APPLICABLE`로 기록할 수 있다.

필수값이 Vivino와 허용된 국내 원천 모두에 없으면 `REJECTED`로 저장하고 `REQUIRED_FIELD_MISSING` Slack
알림에 누락 필드명을 포함한다.

## 10. 내부 수집 API 계약

```text
POST /api/internal/wine-imports
X-Internal-Key: ...
Idempotency-Key: {provider}:{externalVintageId}
Content-Type: multipart/form-data
  data: normalized JSON + provenance + usage grant
  image: 허가가 확인된 이미지, 선택
```

응답 의미:

| HTTP | result | 크롤러 동작 |
|---:|---|---|
| 201 | `CREATED` | `IMPORTED` |
| 200 | `UPDATED` | `IMPORTED`, 동적 필드 갱신 기록 |
| 200 | `DUPLICATE_PASS` | `DUPLICATE_PASS` |
| 409 | `AMBIGUOUS_CONFLICT` | `CONFLICT` + Slack |
| 422 | `REJECTED` | 필드/권한 오류면 `REJECTED` + Slack |
| 401/403 | 인증 실패 | 전체 실행 중단 + danger Slack |
| 429/5xx | 일시 장애 | `RETRY` |

백엔드가 최종 중복 판정을 다시 수행한다. 크롤러에서 PASS했더라도 경쟁 실행 또는 관리자 수동 등록이
사이에 들어올 수 있기 때문이다.

## 11. 데이터 모델 보완

관련 PRD의 V79 staging/provenance 설계에 아래 컬럼과 제약을 포함한다. 같은 구현 PR에서 V79를 아직
적용하지 않았다면 V79에 함께 정의하고, V79가 한 번이라도 적용된 뒤라면 수정하지 말고 V80을 추가한다.

### 11.1 `wine_ingest_candidate` 추가 필드

| 컬럼 | 용도 |
|---|---|
| `canonical_source_url` | URL 중복 키 |
| `wine_identity_key` | 도메인 중복 키 |
| `pass_code` | 확정 중복 사유 |
| `matched_spirit_id` | 중복으로 연결한 자식 Spirit |
| `attempt_count` | 누적 시도 횟수 |
| `next_retry_at` | 다음 재시도 가능 시각 |
| `lease_owner`, `lease_until` | 중복 worker 방지 |
| `last_alert_key`, `last_alerted_at` | 시간대 간 Slack 억제 |
| `first_seen_at`, `last_seen_at` | 발견 이력 |
| `selected_run_id` | 표본 재현 |

제약:

- `UNIQUE(provider, external_key)`
- `UNIQUE(provider, canonical_source_url, vintage_key)`는 URL이 null이 아니고 계약상 안정적일 때만 적용
- `INDEX(status, next_retry_at)`
- `INDEX(wine_identity_key)`

### 11.2 `spirit_external_reference`

- `UNIQUE(provider, external_key)`
- 같은 external key가 두 `spirit_id`에 연결될 수 없다.
- 평점, 평가 수, 원본 맛 값, 조회 시각, source URL, 허가 식별자를 보존한다.
- CaskByCask 내부 평점 필드와 조인해 합산하지 않는다.

### 11.3 `spirit.wine_identity_key`

`spirit`에 nullable `wine_identity_key VARCHAR(64)`를 추가하고 unique index를 둔다.

- WINE 마스터: SHA-256(`producerId|baseNameEn|cuvee|MASTER`)
- WINE 빈티지: SHA-256(`producerId|baseNameEn|cuvee|vintageKey`)
- 기존 위스키·꼬냑에는 null이므로 영향을 주지 않는다.
- 운영 와인은 현재 없으므로 기존 와인 backfill은 필요하지 않지만, 개발 데이터에는 migration 후
  서비스 또는 명시적 backfill 작업으로 키를 생성한다.
- 관리자에서 생산자·영문명·빈티지를 수정할 때도 동일 canonicalizer로 재계산하고 충돌을 검증한다.

해시는 DB에서 임의 문자열 조합으로 만들지 않고 Java 도메인 서비스의 단일 canonicalizer가 생성한다.
Python 크롤러 값은 사전 확인용일 뿐, 최종 키는 백엔드가 재계산한다.

### 11.4 실행·시간당 quota 기록

`wine_ingest_run` 또는 SQLite 동등 저장소에 다음을 기록한다.

- `run_key`, `mode`, `seed`, 시작/종료 시각
- 발견/선택/등록/갱신/중복 PASS/재시도/거절/충돌 수
- provider 요청 수와 응답량
- 시간대별 selected count
- demo 누적 import count

운영에서 여러 서버가 실행될 가능성을 고려하면 시간당 quota와 최종 멱등은 백엔드 DB가 소유하는 것이
안전하다. 단일 서버 초기 운영에서는 SQLite를 사용할 수 있지만, API가 10건 상한을 다시 검증해야 한다.

## 12. 실패·재시도 정책

### 12.1 분류

| 분류 | 예 | 상태 | 재시도 |
|---|---|---|---|
| 일시 장애 | timeout, 429, 502/503, 국내 사이트 일시 실패 | `RETRY` | 예 |
| 영구 누락 | 한글명 없음, 필수 필드 없음 | `REJECTED` | 아니오 |
| 권한 문제 | 필드/이미지 사용권 없음 | `REJECTED` | 설정 변경 전 아니오 |
| 애매한 중복 | 복수 내부 match | `CONFLICT` | 관리자 처리 후 |
| 인증/계약 설정 | provider 401/403, grant 불일치 | 실행 중단 | 설정 수정 후 |
| 내부 API 장애 | 429/5xx/timeout | `RETRY` | 예 |
| 내부 API 검증 | 400/422 | `REJECTED` | 코드/데이터 수정 후 수동 |

### 12.2 재시도 간격

- 1회 실패: 1시간 후
- 2회 실패: 3시간 후
- 3회 실패: 12시간 후
- 4회 실패: 최종 `REJECTED` 또는 운영 장애 성격이면 `CONFLICT`

429의 `Retry-After`가 더 길면 그 값을 우선한다. 인증 401/403은 후보별 재시도를 반복하지 않고 provider
circuit breaker를 열어 해당 실행을 즉시 중단한다.

성공 후에는 같은 실패 키에 대한 알림 억제를 해제하고, 24시간 이상 실패했던 후보만 선택적으로
`RECOVERED` 알림을 보낸다.

## 13. Slack 알림 설계

### 13.1 요구 메시지

수집하지 못한 와인은 실행 종료 시 하나의 메시지로 묶어 보낸다.

```text
[와인 수집 실패] 3건 · runId=123 · 2026-08-06 14:37 KST
1. Château Example 2022
   링크: https://www.vivino.com/...
   사유: KOREAN_NAME_NOT_FOUND — 허용된 국내 원천에서 한글 제품명을 찾지 못함
   처리: REJECTED · candidateId=451 · 시도=1
2. Sample Reserve NV
   링크: https://www.vivino.com/...
   사유: REQUIRED_FIELD_MISSING — 누락: abv, authorizedImage
   처리: REJECTED · candidateId=452 · 시도=1
3. Another Wine 2021
   링크: https://www.vivino.com/...
   사유: DETAIL_FETCH_FAILED — 503, 1시간 후 재시도
   처리: RETRY · candidateId=453 · 시도=2
```

필수 항목:

- 와인 영문명과 빈티지/NV
- canonical Vivino 링크
- 사유 코드와 사람이 이해할 수 있는 한국어 설명
- 최종 상태, candidate ID, 시도 횟수
- 재시도 예정이면 다음 시각

discovery 단계에서 이름을 얻지 못한 예외는 `이름 확인 불가 (externalId=...)`로 표시하고 링크는 반드시
남긴다. 링크도 만들 수 없는 catalog 손상은 와인별 알림 대신 provider 장애로 분류한다.

### 13.2 사유 코드

| 코드 | 설명 | 레벨 |
|---|---|---|
| `DETAIL_FETCH_FAILED` | 상세 조회 실패 | warning |
| `VINTAGE_FETCH_FAILED` | 빈티지 조회 실패 | warning |
| `KOREAN_NAME_NOT_FOUND` | 한글명 미발견 | warning |
| `KOREAN_MATCH_AMBIGUOUS` | 국내 후보 복수/불일치 | warning |
| `REQUIRED_FIELD_MISSING` | 필수 필드 누락 | warning |
| `IMAGE_USAGE_NOT_ALLOWED` | 이미지 권한 미확인 | warning |
| `IMAGE_DOWNLOAD_FAILED` | 허가 이미지 다운로드/검증 실패 | warning |
| `REGION_UNMAPPABLE` | 최소 L1 산지 매핑 불가 | warning |
| `DUPLICATE_AMBIGUOUS` | 자동 병합 불가 | warning |
| `BACKEND_REJECTED` | 내부 API 400/422 | warning |
| `BACKEND_UNAVAILABLE` | 재시도 가능한 API 장애 | warning |
| `VIVINO_AUTHORIZATION_INCOMPLETE` | 허가 설정 누락 | danger |
| `VIVINO_AUTH_FAILED` | 공식 provider 401/403 | danger |
| `HOURLY_LIMIT_BREACH` | 시간당 상한 위반 감지 | danger |

### 13.3 알림 억제

- 확정 `DUPLICATE_PASS`는 와인별 Slack 대상이 아니다.
- 같은 `candidateId + reasonCode + 핵심 사유 hash`는 24시간 동안 한 번만 보낸다.
- 사유가 바뀌거나 최종 재시도에 실패하면 24시간 이내라도 한 번 더 보낼 수 있다.
- 실행당 상세는 최대 10건만 넣고, 그 이상은 총개수와 로그/관리자 필터를 안내한다.
- 기존 `SLACK_MAX_ALERTS_PER_RUN` 상한을 유지한다.
- Slack 전송 실패가 크롤링 트랜잭션을 실패시키지 않는다. 실패는 로그와 run 결과에 남긴다.
- webhook URL은 로그·DB·응답에 절대 기록하지 않는다.

기존 `SlackNotifier`는 재사용하고 `wine_error_alert.py`에서 실행 요약을 만든다. 24시간 억제는
`SlackNotifier._sent_keys`가 아니라 candidate store의 영속 필드를 기준으로 한다.

### 13.4 실행 요약

오류가 없어도 초기 운영에서는 하루 한 번 다음 요약을 보낼 수 있다.

```text
[와인 수집 일일 요약]
발견 84 · 선택 10 · 등록 6 · 갱신 1 · 중복 PASS 2 · 재시도 1 · 영구 거절 0
```

시간당 성공 알림은 보내지 않아 채널 소음을 줄인다. danger 알림은 즉시, 와인별 warning은 실행 종료 시
묶음, 일일 요약은 별도 cron 또는 마지막 실행 통계 집계로 처리한다.

## 14. 이미지·평점·로고 처리

- 공급자가 계약상 허용한 원본 이미지 URL 또는 binary만 받는다.
- 원본 URL은 allowlist, HTTPS, redirect, MIME, 최대 크기, 픽셀, SSRF 검증을 통과해야 한다.
- 권한이 확인되지 않은 이미지는 국내 판매처로 임의 fallback하지 않는다.
- 허용된 대체 원천이 별도 계약에 명시된 경우에만 해당 adapter를 쓴다.
- 이미지는 임시 디렉터리에 내려받고 API 업로드 성공/실패 후 즉시 지운다.
- 영구 파일명은 UUID를 쓰며 외부 URL 경로를 신뢰하지 않는다.
- Vivino 로고와 점수는 대표 이미지 파일에 굽지 않고 웹의 DOM overlay로 표시한다.
- `VIVINO_RATING_BADGE_ENABLED`와 rating/logo 사용 허가가 모두 true일 때만 배지를 보여 준다.
- 점수는 `spirit_external_reference.rating`에 저장하며 `Spirit.avgScore`를 변경하지 않는다.
- 데모 모드는 공식 로고 asset을 사용하지 않고 `VIVINO 승인 후 표시` placeholder만 렌더한다.

## 15. 보안과 운영 안전장치

- 내부 import API는 기존 `X-Internal-Key` 인증을 재사용한다.
- 모든 외부 요청은 timeout, 최대 응답 크기, redirect 횟수, HTTPS allowlist를 강제한다.
- 원본 payload에는 Vivino 사용자 리뷰나 개인정보를 저장하지 않는다.
- 로그에 credential, 내부 key, webhook, signed URL query를 남기지 않는다.
- 후보별 예외를 격리하되 provider 인증/권한 오류는 전체 실행을 중단한다.
- 크롤러는 DB에 직접 쓰지 않고 내부 API를 통해서만 `Spirit`를 생성한다.
- 신규 수집 와인은 초기 `HIDDEN`이며 관리자 승인 없이 자동 ACTIVE하지 않는다.
- crawler cron은 `/tmp/caskbycask-wine.lock`으로 중복 실행을 막는다.
- 배포는 hotdeal/news/wine lock을 모두 획득한 뒤 release symlink를 교체한다.
- 비활성화 스위치 `WINE_CRAWLER_ENABLED=false`가 모든 모드보다 우선한다.
- 배지 비활성화는 `VIVINO_RATING_BADGE_ENABLED=false` 한 값으로 즉시 가능해야 한다.

## 16. 설정값

```dotenv
WINE_CRAWLER_ENABLED=false
WINE_CRAWLER_MODE=FIXTURE_DRY_RUN
WINE_CRAWLER_PROVIDER=fixture
WINE_CRAWLER_DRY_RUN=true
WINE_CRAWLER_HOURLY_LIMIT=10
WINE_CRAWLER_TARGET_STATUS=HIDDEN
WINE_CRAWLER_ALERT_TTL_HOURS=24
WINE_CRAWLER_RETRY_LIMIT=4
WINE_CRAWLER_LOG_PATH=/opt/caskbycask/shared/logs/wine-crawler.log
WINE_CRAWLER_DB_PATH=/opt/caskbycask/shared/crawler/wine-state.db

WINE_DEMO_MAX_TOTAL_IMPORTS=3
WINE_DEMO_ALLOW_NETWORK=false

VIVINO_USAGE_GRANT_REF=
VIVINO_ACCESS_METHOD=
VIVINO_ALLOWED_FIELDS=
VIVINO_RATING_USAGE_ALLOWED=false
VIVINO_LOGO_USAGE_ALLOWED=false
VIVINO_IMAGE_USAGE_ALLOWED=false
VIVINO_RATING_BADGE_ENABLED=false
```

코드상 절대 상한은 10으로 두고 환경변수에 11 이상이 들어오면 10으로 clamp하지 않고 설정 오류로
종료한다. 조용한 보정은 운영자가 잘못된 값을 눈치채지 못하게 하므로 사용하지 않는다.

## 17. 관측성과 관리자 검수

### 17.1 로그

모든 로그는 다음 공통 문맥을 포함한다.

- `runId`, `candidateId`, `provider`, `externalWineId`, `externalVintageId`
- 와인명, 빈티지 키, source URL의 credential 제거 버전
- 단계, 상태 전이, 시도 횟수, 소요 시간
- 중복이면 pass code와 matched spirit ID
- 실패면 reason code와 next retry time

### 17.2 지표

- 실행 성공/부분 성공/실패 수
- discovery 수, 선택 수, 등록 수, 갱신 수
- duplicate pass와 ambiguous conflict 수
- 사유 코드별 reject/retry 수
- provider 및 국내 원천별 응답 시간·오류율
- 시간당 selected 수와 계약 요청량
- 한글명 match 성공률
- HIDDEN → ACTIVE 관리자 승인율

### 17.3 관리자 화면

`관리자 > 주류 > 와인 수집` 페이지를 신설하며 상세 설계는
`docs/admin-wine-crawler-page-prd.md`를 따른다. 결과 탭에는 다음 필터를 제공한다.

- 수집 출처
- `HIDDEN/ACTIVE`
- candidate 상태
- 중복 PASS/충돌/거절 사유
- 한글명 근거 있음/없음
- 최근 수집 시각

후보 상세에는 원문, 필드별 provenance, 중복 match 대상, 실패/재시도 이력, Slack 발송 시각을 표시한다.

## 18. 로컬 테스트 계획

### 18.1 자동 테스트

크롤러 테스트 fixture에는 최소 다음 사례를 둔다.

1. 정상 2022 빈티지
2. 정상 NV
3. 같은 external vintage ID 재등장
4. URL만 같은 중복
5. 기존 수동 와인 identity match
6. 복수 수동 match의 ambiguous conflict
7. 한글명 없음
8. 한글명 후보 복수
9. 필수 필드 없음
10. 이미지 권한 없음
11. 429 후 성공
12. 503이 4회 반복
13. 내부 API 응답 직전 프로세스 종료 후 재실행
14. 후보 50건에서 시간당 10건 상한
15. 데모 누적 3건 뒤 네 번째 차단

검증 항목:

- fixture 모드는 Vivino 도메인으로 네트워크 요청하지 않는다.
- demo 모드는 `WINE_DEMO_ALLOW_NETWORK=true`가 들어와도 시작을 거부한다.
- 외부 ID/URL/identity/DB race 네 단계 모두 중복 Spirit를 만들지 않는다.
- 확정 중복은 `DUPLICATE_PASS`이고 와인별 Slack을 보내지 않는다.
- ambiguous conflict와 실패는 이름·링크·사유가 포함된 Slack 본문을 만든다.
- 같은 실패 알림은 24시간 안에 재전송하지 않는다.
- 사유가 바뀌면 새 알림을 보낸다.
- 한 후보 실패 후에도 다음 후보를 처리한다.
- 10개 중 3개 실패해도 11번째 후보로 보충하지 않는다.
- 백엔드 401/403이면 실행을 중단한다.
- 시간당 quota가 프로세스 재시작 뒤에도 유지된다.
- 운영 DB의 위스키·꼬냑 row는 migration 전후 동일하다.

예상 명령은 구현 PR에서 확정한다.

```powershell
cd caskbycask-crawler
py -3 -m unittest discover -s tests -p "test_wine_*.py"
py -3 wine_main.py --mode FIXTURE_DRY_RUN --provider fixture --limit 10
py -3 wine_main.py --mode LICENSE_REVIEW_DEMO --provider fixture --limit 3
```

3건 데모를 두 번째 실행하면 기존 external ID가 모두 `DUPLICATE_PASS`되고 Spirit row 수가 늘지 않아야 한다.
네 번째로 서로 다른 fixture를 넣으면 `DEMO_LIMIT_REACHED`로 저장을 막아야 한다.

### 18.2 화면 확인

1. 관리자에서 3건 모두 HIDDEN인지 확인한다.
2. 마스터 아래 빈티지/NV 구성이 맞는지 확인한다.
3. 한글명과 영문명 표시 규칙을 확인한다.
4. 맛 4축, 산지, 외부 점수, 원문 링크를 확인한다.
5. 이미지 우측 하단 placeholder 위치를 PC·모바일에서 확인한다.
6. 사용자 공개 URL에서 데모 데이터가 노출되지 않는지 확인한다.
7. 캡처에는 관리자 개인정보, 내부 URL, token, candidate raw payload가 보이지 않게 한다.

## 19. 운영 활성화와 테스트

정식 라이선스 이후 다음 순서를 지킨다.

1. 계약 내용을 `VIVINO_USAGE_GRANT_REF`와 allowlist 설정으로 반영한다.
2. API → Web → Crawler 순서로 배포한다.
3. Flyway 적용 후 기존 위스키·꼬냑 수와 대표 조회를 확인한다.
4. `LICENSED_SANDBOX`, limit=1, `HIDDEN`으로 수동 실행한다.
5. 같은 후보를 다시 실행해 `DUPLICATE_PASS`와 row 수 불변을 확인한다.
6. 한 후보의 의도적 필수값 누락으로 Slack의 이름·링크·사유 형식을 확인한다.
7. limit=3으로 늘려 관리자 검수한다.
8. cron을 켜되 첫 1주는 `HIDDEN`, 시간당 3건으로 운영한다.
9. 중복률, 실패율, 한글명 match, 이미지 권한을 매일 검수한다.
10. 이상이 없으면 시간당 10건까지 올린다.
11. 자동 ACTIVE는 별도 승인 전까지 켜지 않는다.
12. rating/logo/image 각각 계약이 허용한 시점에 독립 feature flag를 켠다.

롤백:

- `WINE_CRAWLER_ENABLED=false`로 신규 수집을 즉시 중단한다.
- `VIVINO_RATING_BADGE_ENABLED=false`로 외부 표시를 즉시 숨긴다.
- 이미 저장된 항목은 자동 삭제하지 않고 HIDDEN으로 전환해 출처/리뷰 FK를 보존한다.
- migration 테이블이나 컬럼은 운영 롤백 시 DROP하지 않는다.
- candidate와 provenance는 계약상 보관 기간에 맞춰 익명정보 없이 정리한다.

## 20. 구현 대상 파일과 문서 동기화

### 백엔드

- 와인 마스터/빈티지 DTO, 서비스, 응답
- 내부 wine import API와 멱등 처리
- candidate/external reference/run 엔티티·repository
- 공통 wine identity canonicalizer
- 신규 Flyway migration(V79 또는 이미 적용됐으면 V80)
- 백엔드 테스트와 `ddl-auto=validate`

### 프론트엔드

- 관리자 다중 빈티지/NV 폼과 수집 검수 정보
- 사용자 빈티지 select
- 외부 평점 overlay와 demo placeholder
- ko/en 번역과 이름 표시 helper
- `docs/wine-research-prompt.md` 동기화

### 크롤러

- `wine_main.py`와 provider interface
- fixture/approved sample provider
- licensed provider fail-closed skeleton
- candidate store, quota, lease, retry, duplicate gate
- 국내명 resolver와 출처 검증
- Slack 실행 요약과 24시간 알림 억제
- `run-wine.sh`와 테스트

### 운영

- `caskbycask-crawler/.env.example`
- `caskbycask-crawler/DEPLOY.md`
- `deploy/env/api.env.example`
- `deploy/server/deploy-crawler.sh`
- `deploy/tests/test-crawler-runtime.sh`
- `.github/workflows/deploy.yml`
- systemd/cron 설정
- `deploy/OPERATIONS-GUIDE.md`의 배포, Secrets, cron, 잠금, 로그, 알람, Cheat Sheet

AGENTS.md 원칙에 따라 운영 관련 파일을 바꾸는 구현 PR에서는 `deploy/OPERATIONS-GUIDE.md`도 반드시
같이 수정한다.

## 21. 단계별 구현 순서

### Phase 1 — 지금 구현

1. 와인 마스터/다중 빈티지 도메인과 관리자·사용자 UI
2. staging/provenance/run/quota DB와 migration
3. 내부 import API의 멱등·중복·HIDDEN 저장
4. fixture/approved sample provider와 demo 누적 3건 상한
5. 중복 4단계 gate와 PASS 상태
6. 실패 분류·재시도·Slack 메시지/24시간 억제
7. 시간당 최대 10건 scheduler와 lock
8. licensed provider의 interface·권한 gate만 구현
9. 자동 테스트, 로컬 3건 데모, 운영 문서 동기화

### Phase 2 — 제한 PoC 승인 후

1. Vivino가 제공하거나 승인한 샘플 접근 방식 연결
2. 로컬 HIDDEN 최대 3건 등록
3. 중복 재실행 검증
4. 관리자·사용자 비공개 화면 캡처
5. 데이터 사용 manifest와 함께 Vivino에 회신

### Phase 3 — 정식 라이선스 후

1. 계약상 API/feed/export adapter 구현
2. 허용 필드 allowlist와 보관/갱신 정책 반영
3. licensed sandbox 1건 → 3건 → HIDDEN cron
4. 1주 표본 검수 후 시간당 10건
5. rating/logo/image flag 개별 활성화
6. 필요 시 별도 승인 후 자동 ACTIVE 정책 도입

## 22. 완료 조건

- 허가 전에는 어떤 설정 조합에서도 Vivino로 자동 네트워크 요청을 보내지 않는다.
- 데모 누적 등록이 3개 빈티지를 넘지 않고 모두 HIDDEN이다.
- 정식 모드에서 시간당 선택·상세 처리·등록이 각각 10건을 넘지 않는다.
- 같은 external ID, URL, 도메인 identity, 저장 경쟁에서 중복 Spirit가 생기지 않는다.
- 확정 중복은 `DUPLICATE_PASS`로 정상 집계되고 와인별 Slack을 만들지 않는다.
- 애매한 중복은 생성하지 않고 와인명·링크·사유를 Slack으로 알린다.
- 수집하지 못한 모든 식별 가능한 후보의 Slack에 와인명·링크·사유가 들어간다.
- 같은 실패는 24시간 동안 반복 알림하지 않는다.
- 일시 장애는 정해진 backoff 후 최대 4회 재시도한다.
- 필수값/한글명/권한 누락 후보는 Spirit를 생성하지 않는다.
- 외부 점수와 CaskByCask 평점이 완전히 분리된다.
- 기존 위스키·꼬냑 에디션, 조회, 리뷰, 랭킹 데이터에 회귀가 없다.
- Flyway, API, Web, Crawler, 배포 테스트가 통과한다.
- 운영 문서와 환경변수 예제가 코드와 일치한다.

## 23. 구현 시작 전에 받아야 할 자료

Phase 1은 추가 자료 없이 시작할 수 있다. Phase 2와 3에는 아래가 필요하다.

1. 제한 PoC 또는 정식 사용을 허용한 Vivino 이메일/계약 식별자
2. 허가된 접근 방식과 credential 또는 샘플 파일
3. 허용 필드 목록
4. 제품 데이터·맛·평점·평가 수·로고·이미지 각각의 사용 여부
5. 캐시/보관/갱신/삭제 조건
6. 화면 캡처와 공개 URL 제공 가능 범위
7. 출처 표기 문구와 링크 방식
8. 시간당/일별 요청량 제한

Vivino에 보낼 첫 검토 자료에는 이 PRD의 3건 데모 화면과 함께 아래 사용 manifest를 첨부한다.

```text
사용 예정 데이터: 영문명, 생산자, 국가/산지, 와인 종류, 빈티지/NV, 도수, 용량,
맛 4축, Vivino 평점/평가 수, 대표 이미지, 원문 링크
표시 위치: 와인 상세 및 대표 이미지 우측 하단 외부 평점 overlay
미사용 데이터: 사용자 리뷰 본문, 사용자 프로필, 가격, 판매자 정보
저장 단위: 와인 마스터 + 빈티지 자식
수집 빈도: 매시 최대 10개 신규 빈티지, 점수 갱신은 별도 계약 주기
초기 공개: HIDDEN 관리자 검수, 자동 공개 안 함
중복 처리: 동일 공급자 ID/URL/생산자·제품·빈티지는 PASS
출처 표기: Vivino 원문 링크와 수집 기준 시각 표시
```
