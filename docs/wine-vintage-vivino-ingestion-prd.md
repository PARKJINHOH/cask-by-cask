# 와인 빈티지·Vivino 기반 수집 PRD

> 2026-08-07 결정: Vivino 수집 영문명은 원문 기준, 국문명은 관리자 수동 입력으로 확정했다.
> 이 문서의 과거 자동 국내명 검색·근거 URL 항목과 충돌하면 본 결정을 우선한다.
> 2026-08-07 추가 결정: Vivino는 별도 API를 제공하지 않으므로, 서면 허가 후 공개 웹페이지의
> HTML 구조화 데이터만 수집한다. API URL·토큰·로그인 세션은 사용하지 않는다.

- 문서 상태: 구현 전 검토안
- 작성일: 2026-08-06
- 대상: `caskbycask-api`, `caskbycask-web`, `caskbycask-crawler`, 운영 배포 문서
- 운영 전제: 운영 DB에는 현재 와인 `spirit` 데이터가 없고 위스키·꼬냑 데이터는 존재함
- 지속 수집·중복 PASS·Slack 실패 알림 상세: `docs/vivino-wine-continuous-crawler-prd.md`

## 1. 결론 요약

1. 현재 애플리케이션에는 이미 와인 단건용 `vintageYear`와
   `vintageStatus(VINTAGE/NON_VINTAGE/UNKNOWN)`가 있다. 관리자 폼에도 연도/NV 선택이 있다.
   새 컬럼 하나를 추가하는 문제가 아니라, **한 와인 마스터 아래 여러 빈티지를 자식 `Spirit`로 저장하고
   사용자가 리뷰 대상 빈티지를 선택하도록 기존 위스키 에디션 구조를 와인에 맞게 확장**해야 한다.
2. 기존 하위 에디션 생성 로직은 자식에 위스키 상세만 저장한다. 이를 화면만 와인에 열어 주면 자식 와인에
   `spirit_wine_detail`이 생기지 않고 모든 자식이 마스터의 같은 연도를 복사하는 불완전 데이터가 된다.
   DTO·서비스·관리자 폼·사용자 선택·검색/SEO 표시를 함께 수정해야 한다.
3. 와인 맛 DB는 이미 5단계 `sweetness/body/acidity/tannin` 구조이므로 컬럼을 교체하지 않는다.
   Vivino식 축인 `Dry ↔ Sweet`, `Light ↔ Bold`, `Soft ↔ Acidic`, `Smooth ↔ Tannic`으로
   표시 문구와 공급자 값 변환 규칙을 바꾼다. 원본 공급자 값은 별도 출처 테이블에 보존한다.
4. **Vivino 공개 웹사이트 직접 크롤링은 서면 허가 전에는 실행하면 안 된다.**
   [Vivino Terms of Service](https://www.vivino.com/en/legal/terms-of-service)는 별도 서면 계약 없는
   상업적 이용과 승인 없는 scraper/crawler/bot 접근을 금지한다. 검색엔진 인덱싱 예외도 일반 서비스의
   데이터 재사용 권한이 아니다. [robots.txt](https://www.vivino.com/robots.txt)가 일부 와인 URL을
   명시적으로 막지 않는다고 해서 약관상 허가가 생기지는 않는다.
5. Vivino 로고와 점수 표시도 별도 사용권 확인이 필요하다.
   [Vivino 상표·평점 라이선스 문서](https://www.vivino.com/vivino_trademark_license_agreement-online.pdf)는
   로고와 Ratings 사용을 라이선스 대상으로 두고 있으며, 공식 문의 페이지는 Ratings·Branding 사용 문의처로
   `retailprogram@vivino.com`을 안내한다([Vivino Contact](https://www.vivino.com/contact/?workflow=merchant)).
6. 따라서 구현을 두 단계로 나눈다.
   - 1단계: 와인 다중 빈티지, 출처/멱등 DB, 내부 수집 API, fixture 기반 로컬 테스트, 관리자 검수 흐름
   - 2단계: Vivino의 서면 웹 크롤링·데이터·평점·로고·이미지 사용 허가를 받은 후
     `VivinoWebCrawlerProvider`와 운영 표시를 활성화

> 이 문서의 정책 검토는 기술적 go/no-go 기준이며 법률 자문은 아니다. 실제 계약 범위는
> Vivino의 서면 답변/계약서와 필요 시 법률 검토로 확정한다.

## 2. 현재 구조 분석

### 2.1 이미 존재하는 기능

| 영역 | 현재 구현 | 판단 |
|---|---|---|
| 빈티지 연도 | `spirit.vintage_year` | 그대로 사용 |
| 빈티지 상태 | `spirit_wine_detail.vintage_status` | 그대로 사용 |
| 단일 와인 폼 | 연도 표기 또는 논빈티지 선택 | UX만 체크박스 형태로 조정 가능 |
| 에디션 관계 | `spirit.parent_id`, `variant_type`, `variant_value`, `display_order` | 와인 빈티지 관계에 재사용 |
| 사용자 에디션 선택 | 리뷰 폼의 하위 에디션 select | 와인용 라벨·검증 추가 후 재사용 |
| 맛 데이터 | 당도·바디·산도·타닌 5단계 enum | DB 변경 없이 Vivino식 축으로 표현 |
| 크롤러 인증 | `/api/internal/**` + `X-Internal-Key` | 신규 와인 수집 API에도 재사용 |
| 크롤러 실행 | Python 프로젝트 + cron + `flock` | `wine_main.py`/`run-wine.sh` 추가 |

주요 확인 파일:

- 백엔드 엔티티: `caskbycask-api/src/main/java/com/caskbycask/domain/spirit/entity/Spirit.java`
- 와인 상세: `caskbycask-api/src/main/java/com/caskbycask/domain/spirit/entity/SpiritWineDetail.java`
- 빈티지 정규화: `caskbycask-api/src/main/resources/db/migration/V51__normalize_wine_vintage.sql`
- 하위 에디션 생성: `caskbycask-api/src/main/java/com/caskbycask/domain/spirit/service/SpiritService.java`
- 관리자 와인 입력: `caskbycask-web/src/domain/admin/components/WineDetailSection.tsx`
- 관리자 공통 폼: `caskbycask-web/src/domain/admin/components/SpiritFormFields.tsx`
- 사용자 리뷰 대상 선택: `caskbycask-web/src/views-spa/ReviewFormPage.tsx`
- 맛 표시: `caskbycask-web/src/domain/spirit/components/WineTasteBars.tsx`
- 크롤러/배포: `caskbycask-crawler/`, `deploy/server/deploy-crawler.sh`

### 2.2 현재 구조의 문제

1. 관리자 폼에서 하위 에디션 UI는 `category === WHISKY`일 때만 열린다.
2. `CreateVariantRequest`에는 `vintageYear`와 `wineDetail`이 없고 `whiskyDetail`만 있다.
3. 백엔드는 자식 생성 시 `saved.getVintageYear()`를 모든 자식에 복사한다.
4. 백엔드는 자식 카테고리가 위스키일 때만 상세를 저장한다. 와인 자식에는 필수인
   `spirit_wine_detail` 행이 생성되지 않는다.
5. 사용자 리뷰 폼은 일반적인 에디션명을 보여 주므로 와인에서 `빈티지`, `NV`로 자연스럽게 보이지 않는다.
6. 사용자가 “없는 에디션 추가”를 선택하면 와인도 일반 문자열만 제출할 수 있다. 이 상태로 와인에 열면
   빈티지 상태·연도·와인 상세·출처가 없는 PENDING 자식이 생긴다.
7. Vivino 점수를 기존 `avgScore`에 넣으면 CaskByCask 사용자 리뷰 점수와 외부 점수가 섞인다.
   외부 점수는 반드시 별도 필드/응답/배지로 유지해야 한다.

### 2.3 관리자 와인 등록 컬럼 실사

사용자가 말한 “관리자 > 주류 등록 > 와인”의 현재 실제 경로는
`관리자 > 주류 > 주류 관리 > 등록 > 와인`이다. 다음 네 소스를 대조했다.

- 폼 상태·검증·payload: `caskbycask-web/src/domain/admin/components/SpiritFormFields.tsx`
- 와인 입력 UI: `caskbycask-web/src/domain/admin/components/WineDetailSection.tsx`
- 백엔드 DTO: `caskbycask-api/src/main/java/com/caskbycask/domain/spirit/dto/WineDetailRequest.java`
- JSON 입력: `caskbycask-web/src/domain/admin/utils/spiritResearchJson.ts`

현재 컬럼과 다중 빈티지 구현 시 저장 위치는 다음과 같다.

| 현재 관리자 입력 | 현재 저장 | 다중 빈티지 구현 판단 |
|---|---|---|
| 한글명·영문명 | `spirit.name_ko/name_en` | 마스터에 저장하되 이름에서 연도/NV 제거 |
| 생산자 | `spirit.producer_id` | 마스터 기준, 자식에 동일 생산자 연결 |
| 국가·지역·산지 코드 | `spirit.country/region/region_code` | 마스터 기준, 자식에 기본 복사; `region` 의미는 기존 L1 유지 |
| 대표 이미지 | `spirit_images` | 빈티지 자식 이미지 우선, 없으면 마스터 이미지 fallback |
| 도수 | `spirit.abv`와 공통 상세 | 빈티지 자식별 값으로 이동; 마스터는 선택적 범위만 표시 |
| 용량 | `spirit.volume_ml`와 공통 상세 | 빈티지 자식별 값으로 이동; 현재 SKU 모델은 추가하지 않음 |
| 와인 종류 | `spirit_wine_detail.wine_type` | 빈티지 자식별 필수 |
| 빈티지 상태 | `spirit_wine_detail.vintage_status` | 빈티지 자식별 `VINTAGE/NON_VINTAGE`; 신규 자식 `UNKNOWN` 금지 |
| 빈티지 연도 | `spirit.vintage_year` | 마스터 null, 빈티지 자식별 저장 |
| 당도·바디·산도·타닌 | `spirit_wine_detail` enum | 기존 5단계 컬럼 유지, Vivino 원본 값은 외부 출처 테이블 |
| 포도 품종·비율 | 와인 상세 연관 데이터 | 빈티지별 저장 |
| 원산지 명칭·토양·고도 | `spirit_wine_detail` | 빈티지별 저장 |
| 수확 방법·발효 용기 | `spirit_wine_detail` | 빈티지별 저장 |
| 오크 여부·종류·개월 | `spirit_wine_detail` | 빈티지별 저장 |
| 내추럴 표방·인증 | `spirit_wine_detail` | 빈티지별 저장 |
| 기타 정보 | `spirit_wine_detail.notes` | 빈티지별 저장, 현재 최대 500자 유지 |
| Vivino ID·링크·평점·평가 수·원본 맛 | 현재 없음 | `spirit_external_reference`에 별도 저장, 폼에서는 읽기 전용 |
| 수집 상태·실패·중복 사유 | 현재 없음 | candidate/run/run-item 테이블에 저장 |

핵심 판단:

- 기존 와인 상세 컬럼은 대부분 충분하므로 맛·양조 컬럼을 교체하지 않는다.
- DB 변경의 중심은 새 와인 속성을 `spirit`에 계속 추가하는 것이 아니라 **빈티지 자식 저장 지원,
  외부 출처, 수집 상태, 중복 identity**를 분리해 추가하는 것이다.
- `wine_identity_key`는 서버가 계산하는 내부 컬럼이므로 관리자 입력이나 JSON에 노출하지 않는다.
- Vivino 평점·로고·이미지 권한 정보도 수동 JSON 붙여넣기로 받지 않는다. 허가 참조가 있는 내부 수집
  API만 저장할 수 있게 한다.

### 2.4 JSON 와인 조사 프롬프트 동기화

현재 `docs/wine-research-prompt.md`는 현재 단일 와인 폼과 맞는다. 하지만 다음 두 부분은 다중 빈티지
구조와 충돌한다.

1. `nameKo/nameEn`에 빈티지 연도를 포함하도록 안내한다.
2. 최상위에 `vintageStatus`, `vintageYear`, 도수·용량, 와인 상세 한 세트만 둔다.

따라서 다중 빈티지 구현 PR에서는 아래 파일을 **같은 커밋 단위로** 변경한다. 프롬프트만 먼저 바꾸면
현재 JSON 붙여넣기 화면이 새 구조를 읽지 못하므로 이 PRD 작성 시점에는 실제 프롬프트를 선행 수정하지 않는다.

- `docs/wine-research-prompt.md`
- `caskbycask-web/src/domain/admin/utils/spiritResearchJson.ts`
- `caskbycask-web/src/domain/admin/components/SpiritJsonImportCard.tsx`
- `caskbycask-web/src/domain/admin/components/SpiritFormFields.tsx`
- `caskbycask-web/scripts/spirit-research-json.test.mjs`
- 와인 프롬프트/폼 정합성 테스트

변경 후 JSON은 “제품 마스터 1개 + `vintages` 배열” 구조를 사용한다.

```json
{
  "category": "WINE",
  "nameKo": "샤토 마고",
  "nameEn": "Château Margaux",
  "producer": { "nameKo": "샤토 마고", "nameEn": "Château Margaux" },
  "country": "프랑스",
  "region": "보르도",
  "regionCode": "FR_BORDEAUX_MEDOC",
  "vintages": [
    {
      "vintageStatus": "VINTAGE",
      "vintageYear": 2018,
      "abv": 13.5,
      "volumeMl": 750,
      "wineType": "RED",
      "grapeVarieties": [
        { "name": "Cabernet Sauvignon", "percentage": 90 },
        { "name": "Merlot", "percentage": 4 }
      ],
      "appellationDesignation": "AOC Margaux",
      "soilType": "Gravel",
      "altitudeM": null,
      "harvestMethod": "Hand-picked",
      "fermentationVessel": "Oak Vat",
      "isOakAged": true,
      "oakType": "French Oak",
      "oakAgedMonths": 24,
      "isNaturalWine": false,
      "certification": null,
      "sweetness": "DRY",
      "body": "FULL",
      "acidity": "MEDIUM_HIGH",
      "tannin": "HIGH",
      "notes": "빈티지별 확인 정보",
      "_sources": ["https://..."],
      "_confidence": "높음",
      "_uncertain": []
    }
  ],
  "_sources": ["https://..."],
  "_nameKoBasis": "국내 공식 수입사 표기",
  "_confidence": "높음",
  "_uncertain": []
}
```

JSON 규칙:

- 한 JSON 객체는 빈티지 하나가 아니라 와인 제품 마스터 하나다.
- `nameKo/nameEn`에는 빈티지 연도와 `NV`를 넣지 않는다.
- `vintages`는 최소 1개이며 같은 연도 또는 NV를 중복할 수 없다.
- `VINTAGE`는 `vintageYear`가 필수이고, `NON_VINTAGE`는 반드시 null이다.
- 도수, 용량, 와인 종류, 포도 구성, 맛, 양조 정보, notes, 출처는 빈티지 객체에 둔다.
- 생산자, 국가, 산지는 마스터에 두고 모든 빈티지의 기본값으로 쓴다.
- parser가 `variantType=VINTAGE`, `variantValue=연도/NV`, 한글/영문 시리즈 식별자를 생성한다.
- AI가 `variantType`, `wineIdentityKey`, external provider ID를 직접 만들게 하지 않는다.
- Vivino 평점·평가 수·로고·이미지 허가는 이 프롬프트 입력 대상이 아니다.
- 여러 제품을 조사하면 위 객체들의 JSON 배열로 반환한다.
- 빈티지별 `_sources/_confidence/_uncertain`을 관리자 각 빈티지 카드의 검수 정보로 보존한다.

필수 회귀 테스트:

- 2022·2021·NV 세 개가 한 마스터의 세 자식으로 mapping
- 이름에 연도/NV suffix가 들어오면 경고하고 저장 전 수정 요구
- VINTAGE 연도 누락, NON_VINTAGE 연도 존재, 중복 연도/NV 거부
- 빈티지별 도수·용량·포도·맛·notes가 섞이지 않음
- enum·선택지·길이 제한이 실제 `WineDetailRequest`, `wine.ts`, `wineTasteScale.ts`와 일치
- 기존 위스키·꼬냑 JSON import 회귀 없음
- JSON 적용은 폼만 채우며 자동 등록하지 않음

## 3. 목표와 비목표

### 3.1 목표

- 관리자가 하나의 와인 마스터에 연도 빈티지 여러 개와 NV를 등록·수정한다.
- 각 빈티지는 독립된 리뷰, CaskByCask 평점, 외부 점수, 맛, 도수, 이미지 정보를 가진다.
- 사용자는 리뷰 작성 전에 정확한 빈티지 또는 NV를 select box에서 고른다.
- 허가된 공급자 데이터는 1시간에 최대 10개 빈티지 후보만 무작위 처리한다.
- 영문 제품명은 Vivino 값을 보존하고 국문명은 관리자 검수에서 직접 입력한다.
- 필수 정보가 허가된 원천과 국내 허용 원천 모두에 없으면 등록하지 않고 거절 사유를 남긴다.
- 중복 실행, 서버 재시작, 네트워크 재시도에도 같은 와인/빈티지가 중복 생성되지 않는다.

### 3.2 비목표

- Vivino의 로그인, 비공개 API, 앱 내부 API, 봇 차단 또는 rate limit 우회
- 수집 요청에 CaskByCask 서비스명·운영 연락처를 노출하는 구현 (고정 UA 1개만 사용하며 로테이션하지 않는다)
- Vivino 사용자 리뷰 본문·사용자 프로필·개인정보 수집
- AI가 출처 없이 한국어 제품명을 생성하거나 빈 값을 추측으로 채우는 기능
- Vivino 점수를 CaskByCask의 `avgScore`, 랭킹, 추천 점수에 합산하는 기능
- 대표 이미지 파일 자체에 Vivino 로고를 합성해 원본을 훼손하는 기능
- 와인 가격 수집 또는 기존 가격 동향 크롤러와 데이터 모델을 합치는 기능

## 4. 데이터 모델

### 4.1 와인 마스터와 빈티지

기존 self-reference 구조를 재사용한다.

```text
와인 마스터 Spirit
  category = WINE
  parent_id = null
  variant_type = VINTAGE
  vintage_year = null
  wine_detail.vintage_status = UNKNOWN
  nameKo/nameEn = 빈티지를 제외한 제품명

  ├─ 2022 빈티지 Spirit
  │    parent_id = master.id
  │    variant_type = VINTAGE
  │    variant_value = "2022"
  │    vintage_year = 2022
  │    wine_detail.vintage_status = VINTAGE
  │
  ├─ 2021 빈티지 Spirit
  │    variant_value = "2021"
  │    vintage_year = 2021
  │    wine_detail.vintage_status = VINTAGE
  │
  └─ 논빈티지 Spirit
       variant_value = "NV"
       vintage_year = null
       wine_detail.vintage_status = NON_VINTAGE
```

결정 사항:

- `VariantType`에 `VINTAGE`를 추가한다. 위스키의 `RELEASE_YEAR`는 출시 연도이고 와인의 포도 수확
  연도와 의미가 다르므로 재사용하지 않는다.
- 마스터는 리뷰 대상이 아니다. 리뷰는 반드시 ACTIVE 자식 빈티지/NV에 저장한다.
- 기존 단독 와인 구조는 개발/테스트 데이터와 하위 호환을 위해 조회 가능하게 둔다.
  운영 와인이 없으므로 신규 관리자 등록과 크롤러 등록부터 마스터-자식 규칙을 적용한다.
- 자식은 마스터의 생산자·국가·산지를 기본 복사하지만, `vintageYear`, `abv`, `volumeMl`,
  전체 `WineDetailRequest`, 외부 평점과 맛 원본은 자식별로 저장한다.
- 빈티지 자식 정렬은 최신 연도 내림차순, NV는 마지막이다.

### 4.2 신규 출처·수집 테이블

다음 Flyway 신규 마이그레이션을 추가한다. 현재 마지막이 V78이므로 구현 시
`V79__add_wine_ingestion_provenance.sql`로 시작한다. 기존 마이그레이션과 V1은 수정하지 않는다.

#### `wine_ingest_candidate`

수집 성공 전 원본·정규화·거절 사유를 보존하는 staging/audit 테이블이다.

| 컬럼 | 용도 |
|---|---|
| `id` | PK |
| `provider` | `VIVINO` 등 공급자 |
| `external_wine_id` | 공급자의 제품 마스터 ID |
| `external_vintage_id` | 공급자의 빈티지 ID |
| `external_key` | 공급자 내 멱등키 |
| `vintage_key` | `2022` 또는 `NV` |
| `status` | `DISCOVERED/ENRICHED/IMPORTED/REJECTED/RETRY` |
| `reject_code`, `reject_detail` | 누락·불일치·권한 문제 |
| `raw_payload` | 허가된 원본 응답 JSON, LONGTEXT |
| `normalized_payload` | 내부 DTO와 같은 정규화 JSON |
| `provenance_json` | 필드별 출처 URL·수집시각 |
| `name_ko_reviewed_at/by` | 국문명 수동 검수 이력(후속 확장) |
| `spirit_id` | 등록된 빈티지 자식 ID, nullable FK |
| `attempt_count`, `next_retry_at` | 일시 장애 재시도 |
| 시간 컬럼 | 발견·시도·등록 시각 |

제약:

- `UNIQUE(provider, external_key)`
- 최종 데이터 누락은 `REJECTED`, 일시 장애만 `RETRY`
- 원본 payload에는 사용자 리뷰·개인정보를 넣지 않는다.

#### `spirit_external_reference`

공개 화면과 관리자 상세가 사용하는 외부 출처 스냅샷이다.

| 컬럼 | 용도 |
|---|---|
| `id`, `spirit_id` | PK/FK |
| `provider` | `VIVINO` |
| `reference_type` | `MASTER` 또는 `VINTAGE` |
| `external_key`, `external_wine_id`, `external_vintage_id` | 멱등·추적 |
| `source_url` | 원문 링크 |
| `rating`, `rating_count` | Vivino 점수와 평가 수 |
| `sweetness_raw`, `body_raw`, `acidity_raw`, `tannin_raw` | 공급자 값을 0~1로 정규화한 원본 |
| `fetched_at` | 점수 기준 시각 |
| `usage_grant_ref` | 운영자가 보유한 데이터/상표 사용 허가 식별자 |
| `provenance_json` | 필드별 근거 |

제약:

- `UNIQUE(provider, external_key)`
- `INDEX(spirit_id)`, `INDEX(provider, external_wine_id)`
- `rating`은 기존 `spirit.avg_score`와 완전히 분리한다.
- 로고/평점 공개 여부는 DB 값만으로 결정하지 않고 운영 feature flag와 사용 허가 설정을 함께 확인한다.

#### 기존 테이블 인덱스

- 빈티지 목록/중복 조회를 위해 `spirit(parent_id, variant_type, vintage_year)` 복합 인덱스를 추가한다.
- NV는 `vintage_year = null`이므로 서비스에서 `variant_value = 'NV'` 중복을 별도로 검증한다.
- 운영 중인 위스키·꼬냑 자식 데이터와 충돌할 수 있으므로 전역
  `UNIQUE(parent_id, variant_type, variant_value)`는 바로 추가하지 않는다.

## 5. 백엔드 변경

### 5.1 DTO

`CreateVariantRequest`에 다음 필드를 추가한다.

```java
Integer vintageYear;
WineDetailRequest wineDetail;
```

`SpiritVariantResponse`와 관리자용 variant 응답에는 `wineDetail`과 외부 출처 요약을 추가한다.

```text
externalRating.provider
externalRating.rating
externalRating.ratingCount
externalRating.sourceUrl
externalRating.fetchedAt
externalRating.displayAllowed
```

기존 위스키 클라이언트가 깨지지 않도록 모두 nullable 응답으로 추가한다.

### 5.2 검증 규칙

- WINE + 다중 빈티지:
  - 마스터 `variantType = VINTAGE`, `vintageYear = null`
  - 빈티지 자식은 `wineDetail` 필수
  - `VINTAGE`이면 `vintageYear`가 1800~현재 연도이고 `variantValue`와 같은 연도
  - `NON_VINTAGE`이면 `vintageYear = null`, `variantValue = NV`
  - `UNKNOWN` 자식은 관리자/크롤러 신규 등록 불가
  - 한 마스터 안에서 같은 연도 및 NV 중복 불가
- 기존 standalone WINE 조회/수정은 허용하되 새 저장 시 명시적으로 마스터 구조로 안내한다.
- WHISKY/COGNAC/OTHER 요청에 `wineDetail` 또는 `VariantType.VINTAGE`가 오면 400 처리한다.

### 5.3 저장 서비스

- 마스터 생성과 모든 빈티지 자식, 상세, 출처 참조를 한 트랜잭션에서 저장한다.
- 자식 생성 시 마스터 연도를 복사하지 않고 `CreateVariantRequest.vintageYear`를 사용한다.
- WINE 자식마다 `saveWineDetail(savedVariant, vReq.wineDetail())`를 호출한다.
- 수정 시 현재의 `variantValue`만으로 찾지 않고 `(parentId, VINTAGE, vintageYear/status)`로 식별한다.
- 삭제된 빈티지는 기존 위스키 정책과 같이 관계 해제 후 HIDDEN 처리해 리뷰 FK를 보존한다.
- 검색 인덱싱 대상에 신규/변경 자식과 마스터를 모두 포함한다.
- 외부 점수 변경은 CaskByCask 리뷰 재집계와 랭킹 재계산을 발생시키지 않는다.

### 5.4 내부 수집 API

신규 엔드포인트:

```text
POST /api/internal/wine-imports
X-Internal-Key: ...
Content-Type: multipart/form-data
  data: 정규화 JSON
  image: 사용 허가가 확인된 대표 이미지, 선택
```

응답:

- `201 CREATED`: 새 마스터/빈티지 생성
- `200 OK`: 기존 external key 데이터 갱신
- `409 CONFLICT`: 다른 external key가 이미 같은 마스터/빈티지로 매핑되어 관리자 확인 필요
- `422 UNPROCESSABLE_ENTITY`: 필수 데이터·출처·허가 정보 누락

서버가 최종 책임지는 항목:

- 요청당 공급자/빈티지 멱등성
- 카테고리 WINE 강제
- region code와 category 검증
- producer exact match 또는 명시적인 신규 WINERY 생성
- 이미지 포맷·크기·SSRF 방어 및 로컬 저장 정리
- `usageGrantRef`가 운영 허가 설정과 맞지 않으면 외부 점수/로고 공개 금지
- 신규 데이터 기본 공개 상태는 `HIDDEN`

초기에는 HIDDEN 등록을 권장한다. 관리자 검수 표본이 충분하고 법적 사용 범위가 확인된 뒤에만
`WINE_INGEST_TARGET_STATUS=ACTIVE`를 허용한다.

## 6. 관리자 프론트엔드

### 6.1 와인 등록/수정 UX

와인 선택 시 위스키의 “에디션 유형” 대신 “빈티지 구성”을 표시한다.

- `+ 빈티지 추가`
- 연도 number input
- `빈티지 없음(NV)` 체크박스
- 체크 시 연도 input 비활성화 및 값 제거
- 연도 입력 시 NV 체크 해제
- 같은 연도/NV 중복 즉시 오류
- 최소 한 개의 빈티지 필요
- 최신 빈티지부터 탭/카드 정렬
- “첫 빈티지 정보 복사” 버튼으로 반복 입력을 줄이되, 저장 전 각 빈티지를 독립 데이터로 전송

각 빈티지 카드에 다음을 둔다.

- 빈티지 연도 또는 NV
- 도수, 용량
- 와인 종류
- 포도 품종/비율
- 원산지 명칭, 토양, 고도, 수확·발효, 오크, 내추럴/인증
- 맛 4축
- 비고
- 대표 이미지(빈티지 전용이 없으면 마스터 이미지 fallback)
- 외부 출처/점수/수집 시각(읽기 전용)

마스터 이름은 빈티지를 제외한 제품명으로 저장한다. 화면의 최종 표시명은 공통 helper가
`제품명 + 2022` 또는 `제품명 + NV`로 조합한다. DB 이름 자체에 연도를 중복 삽입하지 않는다.

### 6.2 수집 데이터 표시

- 관리자 상세에 `수집 출처`, `원문`, `국문명 검수 상태`, `최근 동기화`, `거절/경고`를 표시한다.
- 크롤러가 만든 HIDDEN 와인을 source 필터로 찾을 수 있게 한다.
- 관리자가 이름/상세를 수정해도 외부 동기화가 덮어쓰지 않도록 필드별 잠금 또는
  `manualOverrides`를 기록한다.
- 외부 갱신은 점수/평가 수처럼 동적 필드만 자동 갱신한다. 사람이 수정한 한글명과 설명은 자동 덮어쓰기 금지.

## 7. 사용자 프론트엔드

### 7.1 빈티지 선택

- 마스터 와인의 리뷰 작성 페이지는 빈티지 select를 필수로 표시한다.
- 옵션 예:
  - `2022 · 13.5% · 750ml`
  - `NV · 12.0% · 750ml`
- 빈티지 자식 상세에서 리뷰 작성을 시작하면 해당 자식을 기본 선택하되 다른 빈티지로 변경 가능하게 한다.
- 신규 와인 빈티지를 사용자가 즉석에서 만드는 기능은 1차 범위에서 숨긴다.
  일반 문자열만으로는 출처·연도 상태·와인 상세를 검증할 수 없기 때문이다.
- 추후 사용자 빈티지 요청을 열려면 `CreateVariantReviewRequest`와 승인 화면에
  `vintageStatus/vintageYear`를 추가하는 별도 작업으로 진행한다.

### 7.2 전체 표시 일관성

다음 위치에서 `2022/NV` helper를 공유한다.

- `SpiritCard`
- 주류 상세 제목과 다른 빈티지 목록
- 리뷰 작성/수정
- 검색 자동완성/검색 결과
- 티어리스트
- 보유 병/위시리스트/가격 등록
- SEO title, description, canonical slug, sitemap

모든 사용자 문자열은 ko/en 번역키를 추가한다. 관리자 페이지는 한국어 고정 원칙을 유지한다.

### 7.3 Vivino 배지

- 대표 이미지 우측 하단에 DOM overlay로 렌더한다. 이미지 파일에 로고와 점수를 합성하지 않는다.
- 빈티지 상세에서는 빈티지 점수, 마스터 상세에서는 라이선스가 허용한 마스터 점수만 표시한다.
- `VIVINO {rating}`과 평가 수, 기준 시각, 원문 링크를 제공한다.
- CaskByCask 점수와 시각적으로 분리하고 “외부 평점”임을 명시한다.
- `displayAllowed=false`, 점수 없음, 사용 허가 feature flag 꺼짐 중 하나라도 해당하면 배지를 렌더하지 않는다.
- 허가된 공식 로고 원본만 사용하고 색상·비율을 임의 변형하지 않는다.
- 링크는 새 창, `noopener noreferrer nofollow`를 사용한다.

## 8. Vivino식 맛 축

기존 DB enum과 5단계는 유지한다.

| 내부 필드 | 사용자 축 | 방향 |
|---|---|---|
| `sweetness` | Dry ↔ Sweet | 0 = Dry, 1 = Sweet |
| `body` | Light ↔ Bold | 0 = Light, 1 = Bold |
| `acidity` | Soft ↔ Acidic | 0 = Soft, 1 = Acidic |
| `tannin` | Smooth ↔ Tannic | 0 = Smooth, 1 = Tannic |

공급자 adapter는 원본을 무조건 0~1 방향으로 정규화하고, 내부 5단계는 다음처럼 결정한다.

```text
[0.0, 0.2) -> 1단계
[0.2, 0.4) -> 2단계
[0.4, 0.6) -> 3단계
[0.6, 0.8) -> 4단계
[0.8, 1.0] -> 5단계
```

- 공급자 원본 방향이 반대면 adapter에서만 뒤집고 도메인에는 항상 위 표 방향으로 전달한다.
- UI는 `WineTasteBars`를 계속 공유한다.
- 현재 산도와 타닌이 같은 `WineIntensity` 번역 네임스페이스를 쓰는 부분은 분리한다.
  같은 `LOW`라도 산도는 `Soft`, 타닌은 `Smooth`이기 때문이다.
- 축이 와인 종류상 제공되지 않는 경우는 “정보 누락”과 구분해 provenance에 `NOT_APPLICABLE`을 기록하고
  도메인 값은 null로 둔다.
- `docs/wine-research-prompt.md`, ko/en 번역, enum/UI 정합성 테스트를 함께 갱신한다.

## 9. 수집 파이프라인

### 9.1 권한 전제

운영 provider는 아래 세 조건이 모두 있어야 네트워크 요청을 시작한다.

1. Vivino 공개 웹 크롤링을 허가한 계약/이메일 식별자
2. 허용 페이지와 제품 데이터·평점·로고·대표 이미지 각각의 사용 범위
3. 관리자 설정의 허가 확인과 이용 허가 근거

조건이 없으면 fail-closed한다. 허가 범위의 공개 HTML과 그 안의 JSON-LD/페이지 상태만 읽으며,
로그인·앱 API·GraphQL/JSON 내부 endpoint·CAPTCHA·접근 제한을 우회하지 않는다.

### 9.2 모듈 구조

```text
caskbycask-crawler/
  wine_main.py
  wine_config.py
  wine_models.py
  wine_providers/
    base.py
    fixture_provider.py
    vivino_web.py                 # 허가된 공개 HTML만 수집
  wine_enrichment/
    korean_name_resolver.py
    field_fallback_resolver.py
    match_policy.py
  wine_storage/
    candidate_store.py
  uploader/
    wine_api.py
  run-wine.sh
```

### 9.3 시간당 최대 10건과 무작위 규칙

- cron: KST 매시 37분 `37 * * *`
- 기존 핫딜 정각, AI 소식 17분과 겹치지 않게 한다.
- 실행당 **새 빈티지 import 성공 수는 최대 10건**이다.
- 1건의 기준은 `external_vintage_id` 하나다. 처음 보는 제품이면 마스터 생성은 같은 1건에 포함한다.
- 후보 풀에서 이미 IMPORTED/REJECTED인 external key를 제외하고, 실행 시 기록한 seed로 무작위 표본을 뽑는다.
- 같은 생산자·국가만 연속으로 몰리지 않게 country/wineType을 1차 층화한 뒤 표본화한다.
- 일시 실패는 다음 실행 대상, 영구 누락/불일치는 REJECTED로 두어 매시간 반복 호출하지 않는다.
- 실행 잠금은 `/tmp/caskbycask-wine.lock`을 사용한다. 이전 실행이 끝나지 않았으면 새 실행은 종료한다.
- 점수 갱신은 신규 등록과 분리된 stale queue로 관리하며, 전체 외부 요청 한도는 운영 계약 한도를 넘지 않는다.

### 9.4 국문명 결정

- 영문명은 허가된 Vivino 원문을 기준으로 저장한다.
- 크롤러는 국문명을 국내 사이트에서 찾거나 AI/음차로 생성하지 않는다.
- `spirit.name_ko` 필수 규약 때문에 HIDDEN 수집 단계에서는 영문명을 국문명 컬럼의 임시값으로도 저장한다.
- 두 이름이 같으면 사용자 화면은 영문명 하나만 표시한다.
- 관리자가 마스터 국문명을 직접 수정해야 `검수 완료·공개` 동작이 활성화된다.
- 공개 동작은 마스터와 해당 빈티지를 함께 ACTIVE로 전환하고 자식의 이름도 마스터와 동기화한다.

### 9.5 필드 fallback과 등록 중단

필드 기준은 허가된 Vivino 원천이다. 서로 다른 빈티지를 섞지 않는다.

등록 필수 항목:

- 공급자 제품/빈티지 ID와 원문 URL
- Vivino 기준 영문명
- 내부 DB에 등록된 생산자 영문명
- 국가, 최소 L1 산지, 와인 종류
- 빈티지 상태 및 연도 또는 NV
- 도수, 용량
- 외부 점수, 평가 수, 수집 기준 시각
- 표시되는 맛 축의 원본 값
- 사용 허가가 확인된 대표 이미지
- 각 필드의 근거 URL

예외:

- 특정 와인 유형에서 공급자가 축을 제공하지 않는다고 명시한 맛 축은 `NOT_APPLICABLE`로 허용한다.
- 더 깊은 L2 산지, 토양, 고도, 오크 개월처럼 모든 제품에 존재하지 않는 상세는 선택값이다.
- 필수 항목이 두 원천 모두에 없으면 해당 후보 전체를 등록하지 않는다.

### 9.6 이미지

- Vivino 또는 국내 판매처의 제품 이미지는 공개되어 있다는 이유만으로 다운로드·재게시하지 않는다.
- 계약상 재사용 가능한 이미지 또는 별도 허가된 생산자 이미지에 한해서만 다운로드한다.
- 기존 `safe_http`/이미지 보안 정책을 재사용해 SSRF, redirect, 실제 포맷, 픽셀, 프레임, 용량을 검증한다.
- 저장 시 기존 `FileStorageService` 흐름을 사용하고 임시 파일은 성공/실패 후 모두 삭제한다.
- 허가 이미지가 없으면 본 요구사항의 필수값 미달로 등록하지 않는다.

## 10. 운영 상태와 관측성

환경변수 제안:

```properties
WINE_CRAWLER_ENABLED=false
WINE_CRAWLER_DRY_RUN=true
WINE_CRAWLER_PROVIDER=fixture
WINE_CRAWLER_MAX_IMPORTS_PER_RUN=10
WINE_CRAWLER_TARGET_STATUS=HIDDEN
WINE_CRAWLER_LOG_PATH=/app/caskbycask-crawler/logs/wine-crawler.log
WINE_CRAWLER_DB_PATH=/app/caskbycask-crawler/wine-candidates.db
VIVINO_BASE_URL=https://www.vivino.com
VIVINO_START_URLS=https://www.vivino.com/explore
VIVINO_REQUEST_DELAY_SECONDS=5
VIVINO_REQUEST_TIMEOUT_SECONDS=20
VIVINO_DISCOVERY_PAGE_LIMIT=3
VIVINO_MAX_HTML_BYTES=4194304
# 서비스명·연락처가 없는 값만 허용한다. 비우면 브랜드 없는 기본값을 쓴다.
VIVINO_CRAWLER_USER_AGENT=
VIVINO_RATING_BADGE_ENABLED=false
VIVINO_IMAGE_REUSE_ENABLED=false
```

로그/메트릭:

- 후보 수, 무작위 선택 수, enriched, imported, updated, rejected, retry, error
- 거절 코드별 수: 생산자 없음, 빈티지 불일치, 필수값 없음, 이미지 권한 없음, 중복 충돌
- 외부 요청 수/상태/429
- 마지막 성공 시각, 한 시간 import 수, 실행 시간
- 외부 점수 freshness

Slack 경보:

- 인증/권한 실패, 401/403/429 지속
- 내부 API 인증 실패
- 3회 연속 실행 전체 실패
- 시간당 10건 초과 시도 감지
- 중복 충돌 또는 잘못된 빈티지 매핑
- cron은 성공 0건을 장애로 보지 않는다. 오류 없이 유효 후보가 없을 수 있다.

## 11. 배포 변경 범위

운영 문서 동기화 원칙에 따라 아래를 한 PR에서 함께 수정한다.

- `caskbycask-crawler/.env.example`
- `caskbycask-crawler/README.md`
- `caskbycask-crawler/DEPLOY.md`
- `caskbycask-crawler/run-wine.sh`
- `deploy/server/deploy-crawler.sh`
- `deploy/tests/test-crawler-runtime.sh`
- `.github/workflows/deploy.yml`의 crawler 테스트 범위
- `deploy/OPERATIONS-GUIDE.md`의 배포/Secrets/cron/잠금/로그/알람/Cheat Sheet

배포 스크립트는 hotdeal/news/wine 세 잠금을 모두 획득한 뒤 릴리스 링크를 교체해야 한다.
cron 갱신 실패 시 현재 릴리스와 기존 crontab을 유지한다.

## 12. 테스트 계획

### 12.1 백엔드 자동 테스트

- V79 빈 DB Flyway 전체 적용 및 `ddl-auto=validate`
- 기존 V1~V78 migration 불변성 테스트
- 와인 마스터 + 2개 연도 + NV 생성
- 각 자식의 독립 `vintageYear`, `wineDetail`, 맛 값 저장
- 중복 연도/NV 거부
- WINE 외 카테고리에서 VINTAGE 거부
- 내부 키 없음/오류 401
- external key 재전송 시 UPDATE이며 중복 Spirit 미생성
- 충돌 external key 409
- 필수 출처/허가/이미지 누락 422
- 외부 점수 갱신이 CaskByCask `avgScore`/reviewCount를 변경하지 않음
- 마스터 삭제/숨김/빈티지 제거 시 기존 리뷰 FK 보존
- QueryDSL 조회에서 variant/wineDetail/externalReference N+1 방지

### 12.2 프론트 자동 테스트

- 관리자 연도 ↔ NV 체크박스 상호 배타
- 빈티지 중복 검증과 최신순 정렬
- payload에 자식별 vintageYear/wineDetail 포함
- 리뷰 select가 2022/NV를 올바르게 표시
- ko/en 이름 스왑과 빈티지 suffix
- Vivino 배지 feature flag/권한/점수 유무별 표시
- 외부 점수와 CaskByCask 점수 라벨 혼동 방지
- 맛 축 끝점 번역: Dry/Sweet, Light/Bold, Soft/Acidic, Smooth/Tannic
- `test:wine-taste`, `test:research-prompts`, `admin:verify-form`, typecheck 통과

### 12.3 크롤러 자동 테스트

- fixture provider만으로 네트워크 없이 전체 흐름 테스트
- 후보 50개여도 import 요청 최대 10개
- seed 기반 무작위 결과 재현
- 같은 external key 재실행 시 중복 없음
- 영문명/producer/vintage 중복 매칭과 패키지 오탐 거절
- 필수값 fallback 성공/실패
- 영구 거절과 일시 retry 분리
- dry-run에서 백엔드/파일 저장 없음
- 401/403/429와 타임아웃 재시도·Slack 알림
- 이미지 SSRF/redirect/포맷/크기 검증
- `run-wine.sh`에 venv가 없으면 시스템 Python으로 우회하지 않음
- wine lock 실행 중 deploy가 릴리스를 교체하지 않음

## 13. 구현 후 로컬 테스트 절차

실제 구현 PR에서 아래 명령을 확정한다.

### 13.1 백엔드

```powershell
$env:JAVA_HOME='C:\Users\EM_NB139\.jdks\temurin-21.0.10'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
cd caskbycask-api
.\gradlew.bat --no-daemon clean test
```

로컬 MariaDB를 빈 스키마로 시작해 V1~V79 적용 후 부팅하고, fixture import API를 두 번 호출해
두 번째 호출에서 row 수가 늘지 않는지 확인한다.

### 13.2 프론트

```powershell
cd caskbycask-web
npm.cmd run typecheck
npm.cmd run test:wine-taste
npm.cmd run test:research-prompts
npm.cmd run admin:verify-form
npm.cmd run build
```

수동 확인:

1. 관리자에서 와인 마스터 생성
2. 2022, 2021, NV 추가
3. 저장 후 다시 진입해 값과 순서 확인
4. 사용자 상세/리뷰에서 빈티지 select 확인
5. 리뷰가 선택한 자식 Spirit에 저장되는지 확인
6. feature flag off/on에서 외부 배지 숨김/표시 확인

### 13.3 크롤러

```powershell
cd caskbycask-crawler
py -3 -m unittest discover -s tests -p "test_*.py"
py -3 wine_main.py --provider fixture --dry-run --limit 10
py -3 wine_main.py --provider fixture --limit 1
```

- fixture에는 빈티지 2개, NV 1개, 국문명 미입력, 필수값 없음, 중복 external key 사례를 포함한다.
- Vivino 허가 전에는 로컬에서도 `--provider vivino`가 네트워크 요청 전에 명확히 실패해야 한다.

## 14. 구현 후 운영 테스트 절차

1. API → Web → Crawler 순서로 배포한다. API는 구 Web/Crawler와 하위 호환이어야 한다.
2. 운영 DB에서 와인 수가 0인지 재확인하되 위스키·꼬냑 row는 변경하지 않는다.
3. Flyway V79 적용과 API health를 확인한다.
4. crawler `.env`는 우선 아래 상태로 둔다.
   - `WINE_CRAWLER_ENABLED=true`
   - `WINE_CRAWLER_DRY_RUN=true`
   - `WINE_CRAWLER_PROVIDER=fixture` 또는 계약상 허가된 sandbox
   - `WINE_CRAWLER_TARGET_STATUS=HIDDEN`
   - rating/image badge flag=false
5. `run-wine.sh`를 수동 1회 실행하고 후보/거절/업로드 0건 로그를 검증한다.
6. 허가된 sandbox에서 limit=1로 HIDDEN 와인 한 건을 등록한다.
7. 관리자에서 마스터 국문명을 입력하고 빈티지/이미지/맛/외부 점수를 검수한 뒤 함께 공개한다.
8. 한 빈티지만 수동 ACTIVE로 바꾸고 사용자 상세·리뷰 select·SEO·이미지 배지를 확인한다.
9. 동일 작업을 다시 실행해 중복 row가 생기지 않는지 확인한다.
10. 이상 없으면 cron을 활성화하되 최초 1주일은 HIDDEN 유지 및 매일 표본 검수한다.
11. 서면 허가 범위와 검수 합격률이 기준을 만족할 때만 ACTIVE 자동 등록과 배지를 별도로 켠다.

롤백:

- 즉시 `WINE_CRAWLER_ENABLED=false`, `VIVINO_RATING_BADGE_ENABLED=false`로 새 수집/표시를 멈춘다.
- 크롤러 코드 롤백은 기존 release/previous 절차를 사용한다.
- 이미 등록된 Spirit를 자동 삭제하지 않는다. HIDDEN 처리 후 관리자 검토한다.
- V79 테이블은 하위 호환 추가 테이블이므로 운영 롤백 시 DROP하지 않는다.

## 15. 단계별 구현 순서

### Phase A — 지금 구현 가능

1. `VariantType.VINTAGE`, DTO, 서비스 검증/저장/조회
2. 관리자 다중 빈티지/NV 폼
3. 사용자 빈티지 select와 전체 표시 helper
4. Vivino식 맛 축 문구와 변환 interface
5. V79 staging/provenance 테이블
6. 내부 import API와 fixture provider
7. `wine_main.py`, dry-run, 멱등, 시간당 10건, 잠금/로그/테스트
8. 운영 문서와 연구 프롬프트 동기화

### Phase B — Vivino 서면 허가 후

1. 서면 허가 범위의 공개 HTML을 수집하는 `VivinoWebCrawlerProvider`
2. 계약상 허용 필드만 수집하도록 allowlist
3. Ratings·로고·이미지 각각의 허가 feature flag
4. 허가된 로고 asset과 배지 활성화
5. sandbox → HIDDEN 1건 → 1주 표본 검수 → ACTIVE 여부 결정

## 16. 완료 조건

- 관리자에서 하나의 와인에 여러 연도와 NV를 중복 없이 저장·수정 가능
- 각 빈티지에 독립 와인 상세와 이미지/외부 점수 저장
- 사용자가 리뷰 작성 시 빈티지 선택 필수
- 기존 위스키/꼬냑 에디션, 리뷰, 랭킹, 점수 흐름 회귀 없음
- 외부 점수와 내부 평점 완전 분리
- 실행당 신규 빈티지 최대 10건 보장
- 외부 ID 멱등성과 중복 방지 테스트 통과
- 필수값 미확보 후보 미등록 및 거절 이유 확인 가능
- 허가 없을 때 Vivino 네트워크 접근과 배지가 fail-closed
- Flyway/백엔드/프론트/크롤러/배포 테스트 통과
- `deploy/OPERATIONS-GUIDE.md` 포함 운영 문서 동기화

## 17. 구현 시작 전 필수 결정·자료

1. **Vivino 서면 허가/계약 여부**
   - 허용되는 공개 페이지·경로와 호출 주기
   - 제품 정보, 빈티지, 맛 값, 평점/평가 수, 로고, 제품 이미지 각각의 사용 범위
   - 캐시/보관 기간과 갱신 주기
2. **초기 공개 정책**
   - 권장: 1주 이상 HIDDEN 검수 후 자동 ACTIVE 여부 결정
3. **국문명 운영 책임**
   - 국문명은 외부 자동 수집 없이 관리자가 직접 입력하며 자동 갱신으로 덮어쓰지 않는다.
4. **필수 이미지 정책**
   - 허가 이미지가 없으면 요구사항대로 등록 중단할지,
     또는 이미지 없는 HIDDEN 후보만 관리자에게 남길지 최종 선택이 필요하다.

권장 기본값은 “허가 이미지가 없으면 Spirit 미생성, candidate는 REJECTED로 보존”이다.
