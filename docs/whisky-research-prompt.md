# 위스키 정보 조사 프롬프트

관리자 > 주류 > 위스키 등록 폼에 그대로 옮겨 적을 수 있는 형태로 AI에게 조사를 시키는 프롬프트다.
아래 블록 전체를 복사해 AI에 붙여넣고, 마지막 `## 조사 대상`에 제품명을 적으면 된다.

꼬냑용은 [`cognac-research-prompt.md`](./cognac-research-prompt.md) 참고.

허용 값(enum)은 코드와 1:1로 맞춰져 있다. 값을 바꿀 때는 아래 소스도 함께 고쳐야 한다.

- 스타일 — `caskbycask-api/.../entity/enums/WhiskyStyle.java`
- 캐스크 대분류 11종 — `caskbycask-web/src/domain/admin/components/WhiskyDetailSection.tsx` (`BROAD_CASK_CATEGORIES`)
- 에디션 유형 — `SpiritFormFields.tsx` (`에디션 유형` 버튼)
- 산지 코드 — `caskbycask-api/.../entity/enums/WineRegion.java` (`SpiritCategory.WHISKY` 태그, 107개)
- 길이·범위 제약 — `caskbycask-web/src/domain/spirit/data/spiritLimits.ts`

**에디션 기준 연도는 조사 시점에 맞춰 갱신할 것.** 아래 프롬프트는 "2023년 이후"로 적혀 있다(기준일 2026-08).

---

## 프롬프트 (아래부터 복사)

````
당신은 위스키 전문 리서처입니다. 제가 운영하는 주류 리뷰 사이트의 DB에 등록할 제품 정보를
조사해 주세요. 등록 폼에 그대로 옮겨 적을 수 있도록 **정해진 형식**으로만 답하세요.

# 절대 규칙

1. **추측 금지.** 확인되지 않은 값은 반드시 `null`로 두세요. 그럴듯한 값을 채우는 것보다
   비워두는 것이 낫습니다. 이 데이터는 사용자에게 사실로 제시됩니다.
2. **출처 필수.** 제품마다 참고한 출처를 URL로 남기세요. 우선순위는
   ① 증류소/브랜드 공식 사이트 → ② 국내 공식 수입사 → ③ Whiskybase·Master of Malt 등 전문 DB
   → ④ 전문 매체·리테일러 순입니다. 개인 블로그만 근거일 때는 `_confidence`를 "낮음"으로.
3. **허용 값만 사용.** 아래 목록에 없는 값은 절대 쓰지 마세요. 해당 값이 없으면 `null`입니다.
4. **한국어 이름은 원어 발음이 아니라 국내 통용 표기를 따릅니다.** 아래 "한국어 이름 규칙"을
   반드시 먼저 읽으세요. 이 항목이 이 조사에서 가장 중요합니다.
5. **에디션이 있는 제품은 2023년 이후 출시분만** 조사하세요. 아래 "에디션" 절 참고.

# 한국어 이름 규칙 ★ 가장 중요

위스키는 스코틀랜드 게일어 지명이 많아 **원어 발음과 국내 표기가 다릅니다.**
발음을 그대로 옮기지 말고, **한국에서 실제로 쓰이는 표기**를 찾아서 쓰세요.

## 표기 결정 순서

1. **국내 공식 수입사의 표기** — 가장 우선. 디아지오코리아, 페르노리카코리아, 골든블루,
   신세계L&B, 트랜스베버리지, 아영FBC, 하이트진로, 레뱅드매일 등의 제품 페이지·보도자료
2. **국내 주류 리테일** — 데일리샷, 이마트/트레이더스, 롯데마트, 홈플러스의 상품명
3. **국내 위스키 커뮤니티 통용 표기** — 위 둘에서 확인되지 않을 때만

세 곳 모두에서 확인되지 않으면 외래어 표기법에 따라 음차하되, `_uncertain`에
"국내 표기 미확인 — 음차"라고 반드시 적으세요.

## 검증된 표기 예시 (이 표기를 그대로 쓰세요)

| 영문 | 국내 표기 | 흔한 오표기 |
|---|---|---|
| Glenfiddich | 글렌피딕 | ~~글렌피디치~~ |
| Laphroaig | 라프로익 | ~~라프로아이그~~ |
| Bruichladdich | 브룩라디 | ~~브루이클라디치~~ |
| Bunnahabhain | 부나하벤 | ~~번나하바인~~ |
| Caol Ila | 쿨일라 | ~~카올일라~~ |
| Auchentoshan | 오켄토션 | ~~아우첸토샨~~ |
| Craigellachie | 크레겔라키 | ~~크레이젤라치~~ |
| Clynelish | 클라이넬리시 | ~~클리넬리쉬~~ |
| Glenmorangie | 글렌모렌지 | ~~글렌모란지~~ |
| anCnoc | 아녹 | ~~앤크녹~~ |
| Strathisla | 스트라스아일라 | ~~스트라시슬라~~ |
| Glen Garioch | 글렌 기리 | ~~글렌 개리오크~~ |
| Kilchoman | 킬호만 | ~~킬초만~~ |
| GlenDronach | 글렌드로낙 | ~~글렌드로나크~~ |
| Aberlour | 아벨라워 | ~~아버러워~~ |
| Glenrothes | 글렌로시스 | ~~글렌로테스~~ |
| Tamdhu | 탐두 | ~~탐드후~~ |
| Ardbeg | 아드벡 | ~~아드베그~~ |
| Macallan | 맥캘란 | ~~마칼란~~ |
| Balvenie | 발베니 | ~~발베니에~~ |
| Lagavulin | 라가불린 | |
| Talisker | 탈리스커 | |
| Springbank | 스프링뱅크 | |
| Redbreast | 레드브레스트 | |
| Kavalan | 카발란 | |

**이 표를 근거로 삼되 맹신하지 마세요.** 표에 없는 증류소는 위 순서대로 직접 확인하세요.

## 이름 구성

`nameKo`는 `증류소 + 제품명/숙성연수` 형태로 씁니다.
- `발베니 12년 더블우드`, `아드벡 우거다일`, `글렌피딕 15년 솔레라`
- 숙성 연수는 `12년`처럼 한글 "년"을 씁니다 (`12Y`, `12YO` 아님)
- 캐스크·피니시명은 국내 표기가 있으면 그것을, 없으면 영문 그대로

# 출력 형식

제품 1개당 아래 JSON 객체 하나. 여러 개면 JSON 배열로 묶으세요.
JSON 외의 설명은 배열 뒤에 `## 메모`로 따로 적으세요.

```json
{
  "category": "WHISKY",
  "nameKo": "발베니 12년 더블우드",
  "nameEn": "The Balvenie 12 Year Old DoubleWood",
  "producer": { "nameKo": "발베니", "nameEn": "The Balvenie" },
  "brandName": null,
  "country": "스코틀랜드",
  "region": "스페이사이드",
  "regionCode": "GB_SCT_SPEYSIDE",
  "abv": 43.0,
  "abvMin": null,
  "abvMax": null,
  "volumeMl": 700,

  "style": "SINGLE_MALT",
  "styleOther": null,
  "bottlingType": "OB",

  "casks": [
    { "code": "EX_BOURBON", "isFinish": false, "details": ["아메리칸 오크 배럴"] },
    { "code": "EX_SHERRY", "isFinish": true,  "details": ["올로로소 셰리 벗"] }
  ],

  "isNonChillFiltered": false,
  "isNaturalColour": false,
  "isSingleCask": false,
  "isCaskStrength": false,
  "isPeated": false,
  "phenolPpm": null,
  "phenolPpmMin": null,
  "phenolPpmMax": null,

  "isNas": false,
  "ageStatement": 12,
  "ageStatementMonths": null,
  "distilledDate": null,
  "bottledDate": null,
  "releaseDate": null,
  "batchNo": null,
  "bottleNo": null,
  "totalBottles": null,

  "notes": "발베니의 상시 라인업 중 가장 널리 알려진 제품으로, 위스키 업계에 '더블 우드'라는 이중 숙성 개념을 대중화시킨 1993년 출시작이다. 아메리칸 오크 버번 배럴에서 12년을 채운 뒤 올로로소 셰리 벗으로 옮겨 약 9개월을 더 두고, 다시 매링 툰에서 3~4개월 결합시킨다. 발베니는 자체 보리밭과 플로어 몰팅, 전속 쿠퍼를 유지하는 몇 안 되는 증류소다.",

  "editions": null,

  "_sources": ["https://..."],
  "_nameKoBasis": "윌리엄그랜트앤선즈코리아 공식 제품 페이지 표기",
  "_confidence": "높음",
  "_uncertain": []
}
```

# 필드별 지침

## 기본 정보

| 필드 | 규칙 |
|---|---|
| `category` | 항상 `"WHISKY"`. 관리자 화면 붙여넣기가 이 값으로 카테고리를 정한다 |
| `nameKo` | 200자 이내. 위 "한국어 이름 규칙" 필수 적용 |
| `nameEn` | 라벨 표기 그대로, 200자 이내 |
| `producer` | **증류소**. 브랜드가 아님 |
| `brandName` | 증류소와 **별개**의 상업적 브랜드명일 때만. 블렌디드가 대표적 (조니워커, 시바스리갈, 발렌타인, 페이머스 그라우스). 싱글몰트는 보통 `null` |
| `abv` | 0~100. 배치마다 다르면 `abv`를 `null`로 두고 `abvMin`/`abvMax`에 범위 |
| `volumeMl` | 1~30000. 표준 700, 미국 시장 750, 미니어처 50 |

## 산지

`country`는 한글 국가명을 씁니다. **영국은 `스코틀랜드`·`잉글랜드`·`웨일스`·`북아일랜드` 로
나누어 쓰세요** — 산지 코드(`GB_SCT_*` 등)가 그 단위로 붙어 있어 `영국` 으로 적으면 어긋납니다.
그 밖에는 `아일랜드`·`미국`·`일본`·`대만`·`인도`·`대한민국` 처럼 적고,
`region`은 한글 지역명을 씁니다.

`regionCode`는 아래 목록에 있으면 쓰고, **없으면 `null`로 두세요**(등록 화면에서 직접 고릅니다).

```
스코틀랜드  GB_SCT_SPEYSIDE  GB_SCT_HIGHLAND  GB_SCT_LOWLAND
            GB_SCT_ISLAY     GB_SCT_CAMPBELTOWN  GB_SCT_ISLANDS
아일랜드    IE_DUBLIN  IE_CORK  IE_LOUTH  IE_WESTMEATH  IE_OFFALY
            IE_TIPPERARY  IE_WATERFORD  IE_CARLOW  IE_GALWAY
            IE_KERRY  IE_WICKLOW  IE_MEATH  IE_CLARE
미국        US_KENTUCKY  US_TENNESSEE  US_INDIANA  US_TEXAS
            US_PENNSYLVANIA  US_COLORADO  US_VIRGINIA  US_VERMONT
            US_UTAH  US_MARYLAND  US_NEW_YORK  US_WASHINGTON
일본        JP_HOKKAIDO  JP_IWATE  JP_MIYAGI  JP_FUKUSHIMA  JP_SAITAMA
            JP_YAMANASHI  JP_NAGANO  JP_TOYAMA  JP_SHIZUOKA  JP_AICHI
            JP_SHIGA  JP_OSAKA  JP_HYOGO  JP_HIROSHIMA  JP_KAGOSHIMA
            JP_OITA  JP_WAKAYAMA
대만        TW_YILAN  TW_NANTOU  TW_TAICHUNG  TW_TAIPEI  TW_KAOHSIUNG
대한민국    KR_SEOUL  KR_GYEONGGI  KR_GANGWON  KR_CHUNGBUK  KR_CHUNGNAM
            KR_JEONBUK  KR_JEONNAM  KR_GYEONGBUK  KR_GYEONGNAM
            KR_JEJU  KR_INCHEON
```
(그 외 잉글랜드·웨일스·북아일랜드·인도·캐나다·호주 등도 코드가 있지만 목록이 길어 생략했습니다.
모르면 `null` + `region`에 한글 지역명.)

## 위스키 스타일

### `style` — **필수**. 다음 10개 중 하나.
```
SINGLE_MALT      싱글 몰트
BLENDED_MALT     블렌디드 몰트 (몽키숄더, 조니워커 그린)
BLENDED_WHISKY   블렌디드 (발렌타인, 조니워커, 시바스리갈)
BOURBON          버번
WHEATED_BOURBON  밀 버번 (매시빌에 라이 대신 밀)
TENNESSEE        테네시 (링컨 카운티 프로세스)
RYE              라이
POT_STILL        싱글 팟 스틸 (아일랜드)
GRAIN_CORN       그레인 / 콘
OTHER            기타 — 이때만 styleOther에 100자 이내로 직접 입력
```

### `bottlingType`
```
OB    증류소 직접 병입 (Official Bottling)
IB    독립 병입사 병입 (Independent Bottling) — 시그나토리, 고든앤맥페일, 더글라스랭 등
null  미상
```
IB면 `producer`는 **증류소**를 적고, 병입사는 `notes`에 적으세요.

## 캐스크

`casks` 배열. `code`는 아래 11개 대분류 중에서만 고르고, 구체적 오크통 명칭은 `details`에 넣으세요.

```
EX_BOURBON     버번 캐스크        details 예) 아메리칸 오크 배럴, 퍼스트 필 버번
NEW_OAK        버진 오크          details 예) 아메리칸 버진 오크
EX_SHERRY      셰리 캐스크        details 예) 올로로소, PX, 피노, 만자니야
EX_PORT        포트/주정강화      details 예) 포트, 마데이라, 소테른, 마르살라
EX_WINE        와인 캐스크        details 예) 레드 와인, 샤르도네, 비노 바리끄
EX_RUM         럼 캐스크
EX_COGNAC      꼬냑 캐스크
EX_CALVADOS    칼바도스 캐스크
EX_BEER        맥주 캐스크        details 예) 임페리얼 스타우트, IPA
MIZUNARA       미즈나라 캐스크
OTHER          기타 캐스크        details 예) 매실주 캐스크, 피티드 캐스크
```

- `isFinish`: 주 숙성이 아니라 **추가 숙성(피니시)** 으로 쓰인 캐스크면 `true`
- `details`: 각 100자 이내, 여러 개 가능. 모르면 빈 배열 `[]`
- 캐스크 정보를 모르면 `casks: []`

## 특성 플래그

라벨·공식 자료에 **명시된 경우만** `true`. 추정 금지.

| 필드 | 의미 |
|---|---|
| `isNonChillFiltered` | 저온 여과 생략 |
| `isNaturalColour` | 캐러멜 색소 무첨가 |
| `isSingleCask` | 단일 캐스크 |
| `isCaskStrength` | 원액 그대로 |
| `isPeated` | 피트 사용 |

`isPeated`가 `true`일 때만 `phenolPpm`(0~999)을 채웁니다. 배치마다 다르면
`phenolPpm`을 `null`로 두고 `phenolPpmMin`/`phenolPpmMax`에 범위를 넣으세요.

## 숙성·병입

| 필드 | 규칙 |
|---|---|
| `isNas` | 숙성 연수 미표기(No Age Statement)면 `true`. 이때 `ageStatement`는 `null` |
| `ageStatement` | 라벨의 숙성 연수(년). 12년이면 `12` |
| `ageStatementMonths` | 년 단위로 안 떨어질 때만 (예: 12년 6개월 → `ageStatement: 12`, `ageStatementMonths: 6`) |
| `distilledDate` | `YYYY` 또는 `YYYY-MM` |
| `bottledDate` | `YYYY` 또는 `YYYY-MM` |
| `releaseDate` | `YYYY-MM-DD` |
| `batchNo` | 100자 이내 |
| `bottleNo` | 50자 이내 |
| `totalBottles` | 숫자 (한정판 총 병 수) |

상시 판매 정규 제품은 `distilledDate`·`bottledDate`·`batchNo`·`bottleNo`·`totalBottles`를 전부 `null`로 두세요.

## `notes` — 이 제품의 특징(스펙) 요약 **400자 이내**

폼의 "기타 정보" 칸에 들어갑니다. 사실 나열이 아니라 **이 위스키가 어떤 술인지 읽고 파악되는 문단**으로
400자 이내(공백 포함)로 쓰세요. 아래를 확인된 것만 골라 자연스러운 문장으로 엮습니다.

1. **정체성** — 어떤 위치의 제품인지 (증류소 주력 라인업 / 한정판 / IB 병입)
2. **원료·산지 특성** — 보리·매시빌, 물, 지역이 맛에 주는 성격
3. **증류** — 스틸 형태·크기, 컷 포인트, 증류 횟수 등 공개된 것
4. **숙성** — 캐스크 구성과 비율, 숙성 기간·장소(해안 창고 등), 피니시 기간
   (※ 캐스크 대분류는 `casks`에 이미 있으니 여기서는 **비율·기간처럼 폼에 칸이 없는 것** 위주로)
5. **피트** — 피트 처리 방식, 페놀 수치의 근거
6. **맛 프로필** — 공식 테이스팅 노트 기준의 향·맛·피니시
7. **배경** — 출시 연도, 병입 수량, 수상 이력, 단종·재출시 여부, IB면 병입사

- **모르는 항목은 넣지 마세요.** 7개를 다 채우려고 억지로 늘리지 말 것
- 마케팅 문구를 그대로 옮기지 말고("전설적인", "최고의") 사실 위주로
- 다른 필드에 이미 들어간 값(스타일·도수·숙성연수·특성 플래그)은 반복하지 마세요
- **400자를 넘으면 잘라내지 말고 덜 중요한 항목부터 빼서 다시 쓰세요**

예시(260자):
> 발베니의 상시 라인업 중 가장 널리 알려진 제품으로, 위스키 업계에 '더블 우드'라는 이중 숙성 개념을
> 대중화시킨 1993년 출시작이다. 아메리칸 오크 버번 배럴에서 12년을 채운 뒤 올로로소 셰리 벗으로
> 옮겨 약 9개월을 더 두고, 다시 매링 툰에서 3~4개월 결합시킨다. 발베니는 자체 보리밭과 플로어
> 몰팅, 전속 쿠퍼를 유지하는 몇 안 되는 증류소다. 공식 노트는 꿀과 바닐라에 셰리에서 온 건포도와
> 시나몬이 겹치고, 피니시는 부드럽고 길게 이어진다고 적는다.

# 에디션 ★ 2023년 이후 출시분만

배치·싱글캐스크·연간 릴리즈처럼 **같은 제품이 여러 판본으로 나오는 경우**에만 `editions`를 채웁니다.
단일 정규 제품이면 `editions: null`.

**반드시 2023년 이후 출시된 에디션만 조사하세요.** 그 이전 판본은 넣지 마세요.
2023년 이후 출시분이 없으면 `editions: null`로 두고 `_uncertain`에
"최근 3년 내 신규 에디션 없음"이라고 적으세요.

```json
"editions": {
  "variantType": "BATCH",
  "seriesIdentifier": "배치 시리즈",
  "seriesIdentifierEn": "Batch Series",
  "items": [
    {
      "variantValue": "배치 15",
      "variantValueEn": "Batch 15",
      "abv": 54.8,
      "volumeMl": 700,
      "releaseDate": "2024-03-01",
      "bottledDate": "2024-01",
      "batchNo": "15",
      "totalBottles": null,
      "casks": [{ "code": "EX_SHERRY", "isFinish": false, "details": ["올로로소 셰리 벗"] }],
      "notes": null
    }
  ]
}
```

### `variantType` — 4개 중 하나
```
BATCH         배치        예) 배치 15, Batch 15
SINGLE_CASK   싱글 캐스크  예) 캐스크 #1234, Cask #1234
RELEASE_YEAR  출시 연도    예) 2024 릴리즈, 2024 Release
```
(정규 제품은 `editions: null`. `NONE`은 쓰지 마세요.)

### 규칙
- `seriesIdentifier`(한글)는 **필수**. 모든 에디션이 공유하는 이름 조각입니다.
  예: `배치 시리즈`, `연간 릴리즈`, `1993 29년`. 100자 이내
- `seriesIdentifierEn`은 영문 화면용. 비우면 한글이 대신 쓰입니다
- 각 에디션의 `variantValue`(한글)는 **필수**
- 에디션마다 도수·캐스크·병입 정보가 다르면 각 항목에 개별로 적으세요.
  모든 에디션이 같으면 최상위에만 적고 에디션에서는 `null`
- **출시 연월이 확인되지 않는 에디션은 넣지 마세요.** 2023년 이후인지 판단할 수 없으면 제외하고
  `_uncertain`에 적으세요

# 마지막 확인

JSON을 내놓기 전에 스스로 점검하세요.

- [ ] `nameKo`가 원어 발음 음차가 아니라 **국내 통용 표기**인가. `_nameKoBasis`에 근거를 적었는가
- [ ] `style`이 채워져 있는가 (없으면 등록이 막힙니다)
- [ ] 모든 enum 값(`style`·`bottlingType`·캐스크 `code`·`variantType`·`regionCode`)이
      위 목록에 있는 철자 그대로인가
- [ ] `editions`에 넣은 항목이 **전부 2023년 이후 출시**인가
- [ ] 에디션이 있으면 `seriesIdentifier`와 각 `variantValue`가 모두 채워졌는가
- [ ] 특성 플래그를 추정으로 `true`로 만들지 않았는가
- [ ] 지어낸 숫자가 하나도 없는가 — 모르면 `null`
- [ ] `notes`가 **400자 이내**이고, 사실 나열이 아니라 제품을 파악할 수 있는 문단인가
- [ ] 글자 수 제한(캐스크 `details` 각 100, `seriesIdentifier` 100)을 지켰는가
- [ ] `_sources`에 실제 접근 가능한 URL이 있는가

## 조사 대상

<!-- 여기에 제품명을 적으세요. 예:
- Ardbeg Uigeadail / Corryvreckan
- Glenfiddich 12 / 15 Solera / 18
- Springbank 10
- Kavalan Solist Vinho Barrique
-->
````

---

## 사용 팁

- **한 번에 3~5개**씩 끊어서 시킬 것. 10개를 한꺼번에 시키면 뒤쪽에서 출처 없이 지어낸다.
- 한국어 표기는 AI가 가장 자주 틀리는 항목이다. `_nameKoBasis`가 비어 있거나
  "일반적 표기" 같은 두루뭉술한 답이면 직접 확인할 것.
- 캐스크 `details`를 지나치게 구체적으로 채워 오면 의심할 것. 대부분의 증류소는
  퍼스트필/리필 구분까지는 공개하지 않는다.
- IB(독립 병입) 제품은 증류소명이 라벨에 없는 경우(teaspooned malt, "Secret Speyside")가 있다.
  이때는 `producer`를 병입사로 잡지 말고 `_uncertain`에 남긴 뒤 직접 판단할 것.
- **에디션 기준 연도**는 이 문서 상단 안내대로 조사 시점에 맞춰 프롬프트에서 직접 고칠 것
  (현재 "2023년 이후" = 기준일 2026-08).
