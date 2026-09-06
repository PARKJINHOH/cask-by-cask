# CaskByCask — Claude Code 컨텍스트

## 프로젝트
위스키·와인·꼬냑 주류 리뷰 커뮤니티 플랫폼.
백엔드(caskbycask-api)와 프론트엔드(caskbycask-web) 두 프로젝트로 구성.

## 핵심 원칙
- 보안: 모든 쿼리는 로그인 사용자 userId 기준 필터링, 타인 데이터 접근 금지
- 아키텍처: 백엔드·프론트엔드 모두 DDD 구조
- 최고관리자는 랭킹, 점수획득, 점수차감, 출석체크 등 관련된건 X.

## 백엔드 (caskbycask-api)
- Java 21 / Spring Boot 3.5.x / Gradle Kotlin DSL
- Spring Security + JWT (Stateless, Redis Refresh Token)
- Spring Data JPA + QueryDSL (jakarta)
- MariaDB — local/dev/prod 환경 분리
- **DB 스키마는 Flyway 가 소유 (클린 베이스라인)**: `V1__init_baseline.sql` = 현재 엔티티 전체 스키마. 이후 변경은 `V{n}__*.sql` 추가.
  - ddl-auto: local/dev = `validate`, prod = `none`. 즉 엔티티 스키마를 바꾸면 **반드시 마이그레이션을 추가**해야 부팅됨.
    (local 빠른 반복 시 일시적으로 `update` 전환 가능하나, 커밋 전 마이그레이션으로 정리)
  - 새 DB(빈 스키마)는 Flyway 가 V1~V{n} 으로 스키마+seed 를 모두 구성 → 처음부터 부팅 가능.
  - V1 재생성이 필요하면 엔티티로부터 Hibernate 스키마를 다시 덤프해 교체. (한글 seed 편집 시 PowerShell `Get-Content -Raw` 금지 — UTF-8 깨짐. .NET `File.ReadAllText` 사용)
- 공통 응답: ApiResponse<T> 래퍼
- 예외: GlobalExceptionHandler + ErrorCode Enum
- JAVA_HOME = "C:\Users\EM_NB139\.jdks\temurin-21.0.10"
- JAVA_HOME = "C:\Users\JINHOH_PC\.jdks\temurin-21.0.10"

## 인프라/배포 (개인 운영 커뮤니티 — 사업자 없음)
- **서버: Oracle Cloud Infrastructure, 대한민국 춘천 리전** (현재). 이용자 증가 시 추후 AWS 전환 가능.
- 파일 저장: 현재 Oracle Cloud 인스턴스 내 디스크에 직접 저장(서버 로컬, `storage.local.base-path: ./uploads`) → 같은 서버가 직접 서빙. `S3FileStorageService`는 추후 외부 오브젝트 스토리지 연동용 빈 스텁(미사용).
- 이메일: Gmail SMTP (Google, drinkindex.cs@gmail.com). `AwsSesEmailSender`는 비활성(`app.email.provider: smtp`).
- 개인정보 보호책임자 / 서비스 운영자: 박진호
- ※ 약관·개인정보 처리방침에 위 인프라(국내 보관 등)가 반영됨 — 인프라 변경 시 `LegalDocumentTemplate.java` + `defaultTemplates.ts` 동기 수정 필요.
- ※ **운영 문서 동기화**: 배포 방법(`.github/workflows/deploy.yml`)·서버 구성·systemd 유닛(`deploy/systemd/*`)·운영 스크립트(`deploy/server/*.sh`)·환경변수(`deploy/env/api.env.example`)·알람을 변경하면 **반드시 `deploy/OPERATIONS-GUIDE.md` 의 해당 절(배포/Secrets/스크립트/알람/Cheat Sheet)도 함께 갱신**한다. 코드와 운영 매뉴얼이 어긋나지 않게 한 PR 안에서 같이 수정할 것.

## 프론트엔드 (caskbycask-web)
- React + TypeScript + Next.js
- Zustand (authStore, 각 도메인 store)
- React Query (서버 상태)
- Axios (인터셉터: 자동 토큰 갱신)
- Tailwind V4 (primary: amber)
- react-i18next (ko 기본, en 지원)
- PC, 모바일 반응형 고려해서 구현
- PC에서는 화면을 보다 넓게 사용하는 UI/UX로 구현.
- node = "C:\Program Files\nodejs"

## 다국어(i18n) 개발 원칙
- **모든 UI 문자열은 반드시 `t()` 번역키 사용** — 하드코딩 한글/영어 금지 (관리자 페이지 제외)
- 번역 파일: `src/locales/ko.json` (한국어), `src/locales/en.json` (영어)
- 언어 저장: localStorage `di_lang` / 토글: MainLayout `LangToggle` 컴포넌트
- **술 이름(nameKo / nameEn) 표시 규칙**
  - `ko` 모드: `nameKo` = 메인 타이틀(굵게/크게), `nameEn` = 서브타이틀(작게/흐리게)
  - `en` 모드: `nameEn` = 메인 타이틀, `nameKo` = 서브타이틀
  - `nameEn`이 없을 경우 `nameKo` fallback 적용 (`nameEn || nameKo`)
  - 동일 규칙을 SpiritCard, SpiritDetailPage, 검색결과 등 모든 술 표시 위치에 일관 적용
  - 증류소명(distilleryNameKo / distilleryNameEn)도 동일 규칙 적용
- 새 기능 구현 시 체크리스트:
  1. `ko.json` / `en.json` 양쪽에 번역키 동시 추가
  2. 컴포넌트에서 `const { t, i18n } = useTranslation()` 훅 사용
  3. 술 이름 표시가 있으면 `isEn = i18n.language === 'en'` 기반 스왑 적용
  4. 관리자(`/admin/**`) 페이지는 한국어 고정 유지


## 산지 지도 (Origin Map) — 와인 · 위스키 · 꼬냑
사용자 상세 페이지에서 산지를 **한 화면 안에서 국가 지도 ⇄ 세부 산지 확대 지도로 전환**해 보여주는 기능.
- **산지 카탈로그의 단일 소스는 백엔드 `WineRegion` enum** (`domain/spirit/entity/enums/WineRegion.java`).
  이름은 역사적으로 `WineRegion` 이지만 **와인 전용이 아니다** — 각 산지가 `categories` 로
  쓰이는 카테고리를 선언한다. 미국·프랑스·호주·일본은 카테고리가 겹치므로 필터가 필수다
  (버번 등록 화면에 나파 밸리가 나오면 안 된다).
  - **와인 22개국** = 프랑스·이탈리아·스페인·포르투갈·독일·오스트리아·헝가리·그리스·조지아·레바논·중국·
    미국·칠레·아르헨티나·우루과이·호주·뉴질랜드·남아프리카 공화국·일본·인도·캐나다·잉글랜드
  - **위스키 20개국** = 스코틀랜드·잉글랜드·웨일스·북아일랜드·아일랜드·일본·대만·한국·인도·캐나다·
    미국·호주·남아공·독일·프랑스·스웨덴·네덜란드·덴마크·핀란드·이스라엘
  - **꼬냑** = 프랑스 꼬냑 지방 + 법정 6개 크뤼
  **어떤 산지를 넣을지는 시드 SQL(V4 증류소 / V5 와이너리 / V6 꼬냑)에 실제로 등록된
  (country, region) 값을 기준으로 정한다** — 실데이터에 없는 산지를 추측으로 넣지 않는다.
  한글 표기는 **wine21·와인나라 등 국내 통용 표기**를 따른다(복합어는 띄어쓰기: `나파 밸리`, `코트 드 뉘`).
  한국 시도는 기존 지역 텍스트 사전과 어긋나지 않게 통용 표기(`강원도`·`제주도`·`서울`)를 쓴다.
- `GET /api/wine-regions?category=WHISKY` 로 카테고리별 카탈로그를 받는다.
  **category 미지정 시 와인만 반환**하므로 이미 배포된 프론트엔드는 영향이 없다.
- **지도 도형은 프론트 `caskbycask-web/src/domain/location/data/wineRegionMap/*.ts`** 가 소유한다.
  이 파일들은 **자동 생성물**이므로 직접 수정하지 말고 `npm run map:build` 로 재생성한다.
  형상은 **정밀도 우선**(원해상도 소스 + 서브픽셀 단순화)으로 만들고, 국가당 **300KB 상한**을 지킨다.
  용량은 국가별 동적 import 로 지연 로딩해 흡수한다 — 지도 카드가 화면에 들어올 때 그 국가만 받는다.
  스코틀랜드는 `GB-SCT` 처럼 하이픈이 있어 파일명은 `gb-sct.ts`, export 이름은 `GB_SCT_MAP` 이다.
- 지역 라벨은 `localizeSpiritRegion(spirit.wineRegion, spirit.region, lang)` 를 쓴다.
  `spirit.region` 텍스트 사전(`REGION_SUGGESTIONS`)에는 샹파뉴·보졸레·라우스·사이타마 등이 없어
  텍스트만으로는 영어 모드에서 한글이 노출된다. 백엔드가 내려준 ko/en 산지명을 우선할 것.
  지역 필터 칩(`RegionChips`·`ActiveFilterChips`)도 같은 이유로 카탈로그를 조회해 번역한다.
- 저장 형태: `spirit.region_code`(varchar 40, nullable)에 관리자가 고른 **가장 깊은 레벨**을 저장하고,
  기존 `spirit.region` 텍스트는 서비스가 **L1 산지명으로 자동 동기화**한다.
  → 기존 지역 필터(`GET /api/spirits/regions`)·검색·SEO 가 그대로 동작한다. `region` 컬럼 의미를 바꾸지 말 것.
- `UpdateSpiritRequest.regionCode` 는 `abvMin`/`abvMax` 와 같은 규약으로 **null = 해제**다(변경 안 함이 아님).
  관리자 폼은 항상 이 필드를 전송해야 한다. 카테고리를 바꾸면(와인↔위스키 포함) 산지 코드를 해제한다.
- **생산자(`producer.region_code`)** 는 기본적으로 `LegacyWineRegionResolver` 가 국가·지역 텍스트에서
  해석하지만, **꼬냑 하우스는 관리자 폼이 산지 카탈로그 2단 선택기로 세부 산지(크뤼)를 직접 지정**한다
  (`Create/UpdateProducerRequest.regionCode`). 지역 텍스트("꼬냑")만으로는 크뤼를 표현할 수 없기 때문이다.
  코드를 보내면 그 값을 쓰고, 비워 보내면 기존처럼 텍스트에서 해석한다(사용자 등록 요청 경로는 후자).
  시드 생산자의 크뤼 백필은 `V71` 이며, 소개문에 단일 크뤼가 명시된 하우스만 올리고 나머지는 `FR_COGNAC`(미등록)로 둔다.
- 상세 페이지: **와인은 PC 2분할**(좌: 맛 5단계 바 / 우: 산지 지도),
  **위스키는 맛 지표가 없어 지도 단독**으로 좌측 폭(`lg:max-w-md`)에 둔다.
  산지 텍스트(`국가 › L1 › L2`)는 지도 위 별도 영역에 표시하고, 산지가 없으면 2분할 대신 1열로 둔다.
  지도는 페이지 이동 없이 같은 카드 안에서 확대/복귀한다(좌상단 뒤로가기).

### 스카치 위스키 산지의 법적 근거
스카치 위스키 규정(The Scotch Whisky Regulations 2009) 제10조가 정한 **법정 지리적 표시 5개**를 그대로 쓴다.
- 캠벨타운 = Argyll and Bute 의회의 **South Kintyre ward**
- 아일라 = **아일라 섬** 전체
- 스페이사이드 = Moray 의회 8개 ward(= **Moray 전역**) + Highland 의회 **Badenoch and Strathspey ward**
- 하이랜드/로우랜드 = 법정 분할선(그리녹–카드로스–얼즈 시트–월리스 기념탑–A91–M90–언 강–테이 강) 북/남
  이 선은 도로·강 기반이라 행정경계와 일치하지 않아 **의회구역을 북/남으로 배정해 근사**한다
  (선이 관통하는 스털링·퍼스 앤 킨로스·웨스트 던바턴셔는 다수 면적 기준 — 근거를 빌드 설정 주석에 남겼다).
- 규정상 **하이랜드는 스페이사이드를 지리적으로 포함**한다. 지도에서 구역이 겹치는 것은 정상이며,
  대상 구역을 **마지막에 그려** 강조가 가려지지 않게 한다(컴포넌트·프리뷰 하네스 모두).
- '아일랜드(섬)' 은 법정 표시가 아니라 업계 통용 구분이다 — 실제 섬 경계(오크니·셰틀랜드·헤브리디스 +
  스카이·멀·주라·아란)로만 구성하고 비법정임을 주석에 남겼다.

### 산지를 추가·수정할 때
1. 백엔드 `WineRegion` enum 에 항목 추가 (L2 는 `parentCode` 로 L1 지정). 코드 40자 이내.
   위스키 등 와인이 아닌 산지는 **5번째 인자로 카테고리를 지정**한다(4-인자 생성자는 WINE 기본값).
   코드 접두사는 `countryCode` 의 하이픈을 언더스코어로 바꾼 값이어야 한다(`GB-SCT` → `GB_SCT_ISLAY`).
2. `caskbycask-web/scripts/build-wine-region-map.mjs` 의 해당 국가 설정에 매핑 추가
   (FR=INAO AOC 이름 · `departement` / US=AVA·주·카운티 FIPS / IT=레조네·코무네 /
   ES=자치공동체·무니시피오 / CL=코무나 / AU=Wine Australia GI /
   PT·DE·AT=GISCO NUTS3 `nuts`·`nutsPrefix` /
   HU·NZ·AR·ZA·JP·TW·KR·IN·CA·SE·NL·DK·FI·IL·CN·GR·GE·LB·UY=geoBoundaries `unit`(상위) · `subUnit`(하위) /
   GB-SCT=`council`·`ward`·`island` / GB-ENG·GB-WLS·GB-NIR=`council` / IE=OSi `county`).
   이름이 틀리면 빌드가 유사 후보와 함께 일괄 보고한다.
   - `subUnit` 은 이름이 주(州) 경계를 넘어 중복되므로(`San Rafael`·`Maipú`) `within` 으로 상위 단위를 함께 지정한다.
     내부 판정은 **평면 ray casting**(`containsPlanar`)이다 — `d3.geoContains` 는 링 감김 방향에 결과가 뒤집혀 쓰지 않는다.
   - `island` 은 멀티폴리곤에서 섬 하나를 좌표로 특정한다. 단순화 때문에 해안 마을 좌표가 폴리곤 밖으로
     밀려날 수 있어, 내부 판정 실패 시 **점을 감싸는 가장 작은 bbox** 폴리곤으로 폴백한다.
3. `npm run map:build` → `npm run map:preview` 로 형상 시각 확인 → `npm run map:stats` 로 용량·커버리지 확인.
4. 새 국가라면 `wineRegionMap/index.ts` 의 `WINE_REGION_MAP_LOADERS` 에 **등록**해야 한다(누락 시 조용히 미표시).
   여기서 `_MAP` 을 정적 import 하면 코드 스플리팅이 깨진다 — 테스트가 이를 막는다.
5. `npm run test:wine-region-map` + `npm run test:wine-origin-map` + `npm run test:region-label`
   + `npm run map:verify` + `npm run map:verify-ui` 통과 확인.
   - 이 스크립트들은 Java enum 을 정규식으로 파싱한다. 생성자 형태(카테고리 varargs)나
     국가 코드 형식(`GB-SCT`)을 바꾸면 **정규식도 함께 고쳐야** 한다.

### 지켜야 할 제약
- **산지 도형은 공개 산지·행정 경계 데이터에서만 만든다. 수작업 도형 금지.**
  공식 산지 경계가 없으면 그 산지를 품는 **실제 행정구역으로 근사**하고 코드에 근거를 주석으로 남긴다
  (미국 카운티, 남아공 드라켄스타인=파를 등). 추측으로 구성 단위 목록을 만들지 말 것.
- 국가 파일이 300KB 를 넘으면 빌드가 실패한다. 완화는 **배경 문맥 도형부터** —
  `tolZoomOutline`·`minAreaCountry` 를 올리고, 대상 산지 도형의 정밀도를 깎는 것은 마지막 수단.
- 경계 데이터 출처는 `CountryMap.attribution` 에 담아 지도 카드 하단에 표시한다 —
  Licence Ouverte / CC BY 계열 라이선스의 **출처 표기 의무** 이행 수단이므로 제거하지 말 것.
  geoBoundaries 오스트리아는 CC BY-SA 라 의도적으로 GISCO NUTS 를 쓴다.
  **일본·대만도 geoBoundaries ADM2 가 CC BY-SA 라 ADM1(ODbL)만 쓴다.** 무라이선스 소스는 금지.
- 기하 데이터가 없는 국가·산지는 지도를 렌더하지 않고 기존 텍스트 표기만 남긴다(그레이스풀 폴백).
- `d3-geo`·`topojson-client`·`polygon-clipping` 은 **빌드 전용 devDependency** 다. 런타임 코드에서 import 금지.
- 원본 지리 데이터는 `caskbycask-web/.cache/` 에 캐싱되며 gitignore 대상이다(산출물만 커밋).

### 현재 커버리지 (`npm run map:stats`)
- L1 **226/226**, L2 **87/107**.
- 미구축 L2 20건은 지도 없이 텍스트 표기만 나온다:
  스페인 DO 13건(리오하 알타·알라베사·오리엔탈, 리베라 델 두에로, 루에다, 토로, 비에르소,
  페네데스, 몬산트, 리아스 바이사스, 리베이라 사크라, 발데오라스, 몬티야 모릴레스) —
  **공식 DO 경계 지오데이터가 공개되어 있지 않다**(OSM 에도 없음). 무니시피오 목록을 관보에서
  전사해야 하므로 추측 금지 원칙상 보류. 후미야도 같은 이유로 보류. /
  오스트리아 바하우·캄프탈·크렘스탈, 태즈메이니아 2건,
  남아공 프란슈크(스텔렌보스 자치구 내부라 독립 경계 없음).
- 위스키 산지는 모두 L1 이다(법정 세부 산지가 없다) — 확대 지도가 없으므로 국가 지도만 표시된다.
- 프랑스는 와인 AOC + 꼬냑 6개 크뤼 + 브랜디·위스키 근사까지 담아 300KB 에 근접한다.
  용량은 **법정 경계가 아닌 근사 도형부터** 완화한다 —
  `tolRegion`(칼바도스·브르타뉴)·`tolZoomRegion`(꼬냑 크뤼)·`tolZoomOutline`(확대 배경) 순.

## 와인 맛 지표 (당도·바디·산도·타닌)
- **5단계** 스케일이다(wine21 필터와 동일). enum 은 `Sweetness`·`Body`·`Acidity`·`Tannin`,
  각 값에 `level`(1~5)이 있고 마이그레이션은 `V64` 다.
- MySQL `enum(...)` 컬럼은 `ddl-auto=validate` 를 통과하도록 **알파벳 순서**로 정의한다.
- 표시 컴포넌트는 관리자·사용자가 **`WineTasteBars` 하나를 공유**한다(관리자는 편집 가능, 사용자는 읽기 전용).
  스케일 정의는 `wineTasteScale.ts` 가 백엔드 enum 순서를 미러링한다 — 한쪽만 바꾸면 어긋난다.

## 가격 데이터 (가격 동향 · 가격 등록 승인)
가격 차트(`PriceChartService`)는 **두 테이블을 합쳐** 그린다. 성격이 달라 화면·메뉴도 둘로 나뉜다.

| 소스 | 테이블 | 유입 경로 | 관리자 메뉴 |
|---|---|---|---|
| 사용자 제보 | `price_reports` | 사용자 `POST /api/price-reports` → 검토 후 승인 | 가격 등록 승인 |
| 수집·직접 등록 | `deal_posts` | 크롤러 `POST /api/internal/deals`(PENDING) / 관리자 `POST /api/admin/deals`(즉시 APPROVED) | 가격 동향 |

- **명칭은 '핫딜' 대신 '가격 동향'** 을 쓴다(할인 홍보가 아니라 가격 정보 제공이라는 성격을 드러낸다).
  테이블·엔티티·API 경로(`deal_posts`/`DealPost`/`/api/admin/deals`)는 **바꾸지 않았다** — 운영 중 스키마라서
  이름만 UI 레이어에서 바꿨다. 코드에서 deal 을 만나면 '가격 동향'으로 읽을 것.
- 사용자 노출 배지는 `price.panel.hotDeal`(ko `특가` / en `Special Price`) 번역키다.
  문구를 바꾸려면 이 키만 고치면 된다 — 컴포넌트에 하드코딩 금지(`admin-menu.test.mjs` 가 막는다).
- **관리자 직접 등록**(`DealAdminService.create`)의 제약과 이유:
  - `spiritId` **필수** — 차트는 `spirit_id + APPROVED + is_visible` 로 집계하므로 미연결 건은 유령 데이터가 된다.
  - `source_url` 은 NOT NULL + UNIQUE(크롤러 멱등키)라, 원문이 없으면 `admin://deal/{UUID}` 를 생성한다.
    `admin://` 은 http(s) 가 아니므로 `isOpenableSourceUrl()` 로 링크 렌더를 건너뛴다.
  - **외화 등록을 허용**한다(V96~). `deal_posts` 에도 `deal_price_krw`/`exchange_rate_snapshot` 이 생겨
    저장 시점에 `DealExchangeRateApplier` 가 원화를 확정하고, 차트는 그 환산값만 집계한다.
    지원 통화는 `PriceCurrency` enum(KRW/USD/TWD/JPY/CNY/EUR) 뿐이며 그 외는 `DEAL_CURRENCY_NOT_SUPPORTED`.
    환율 조회에 실패하면 환산값이 NULL 로 남고 `PriceChartService` 가 그 행을 차트에서 제외한다 —
    환산 없는 외화가 원화 축에 섞여 "$187 → 187원" 으로 찍히던 사고(운영 spirit 236 면세)를 막는 방어선이다.
    V96 이전 수집분은 `POST /api/admin/deals/backfill-krw` 로 수집일 환율을 채운다.
  - 관측일(`observedAt`)을 `crawled_at` 에 저장한다 — 차트 X축이 `crawledAt ?: createdAt` 이다.
  - 등록자에게 **점수를 주지 않는다**(제보 점수는 `price_reports` 승인 시에만 지급).
- 관리자 화면은 `/admin/deals/new` 가 `AdminDealDetailPage` 의 **등록 모드**를 재사용한다
  (주류 검색·배치 선택 로직을 복제하지 않기 위함). 정적 경로라 `deals/:id` 보다 먼저 매칭된다.

## 소식(AI) — AI 는 소재까지, 기사는 사람이
원래는 AI 가 본문을 쓰고 관리자가 검토·발행하는 구조였다. 그런데 본문 품질이 기준에 못 미쳐
관리자가 매번 근거 URL 만 보고 기사를 처음부터 다시 썼다 — **가장 비싼 산출물이 곧 폐기물**이었다.
그래서 AI 의 일을 "무슨 일이 있었는지 찾아 알려 주기"로 줄였다.

- **AI 는 본문을 쓰지 않는다.** 크롤러가 저장하는 것은 제목·요약(`lead_summary`)·근거 URL 뿐이고
  `content` 는 빈 문자열이다. `write_release`/`write_tip`/`rewrite_article` 과
  `AI_NEWS_WRITING_PROMPT`(363줄)는 `V94` 와 함께 사라졌다. **되살리지 말 것** — 되살리면
  관리자가 버릴 원고를 다시 만들게 된다.
- **본문·대표 이미지·발행은 전부 관리자 몫이다.** 자동 발행은 없고(1단계에서 제거),
  이미지 생성도 없다. 관리자 수정 폼(`AdminAiNewsFormPage.tsx`)이 실제 작업대다.
- **본문이 빈 원고는 발행되지 않는다.** `publish()` 와 `publishScheduled()` 가
  `AI_NEWS_EMPTY_CONTENT` 로 거부하고, 목록에서도 발행 버튼이 뜨지 않는다.
  이 검증을 빼면 소재를 그대로 눌러 **빈 공지가 게시된다.**
- 크롤러 DTO(`LeadIngestRequest`)와 관리자 DTO(`ArticleUpsertRequest`)를 **나눠 둔 이유**가 이것이다.
  본문 필수 여부가 정반대라 하나로 합치면 `@NotBlank` 를 풀어야 하고, 그러면 관리자 실수를 아무도 못 막는다.

### 소재는 원고 목록에 섞여 들어온다
별도 테이블도 별도 탭도 없다. 소재는 `ai_news_articles` 에 `PENDING_REVIEW` 로 저장된다.

- 목록 기본 필터와 사이드바 배지가 둘 다 `PENDING_REVIEW` 라(`AdminAiNewsPage.tsx`, `AdminLayout.tsx`)
  **배지 숫자가 곧 "처리할 소재 수"** 다. 이 상태를 바꾸면 배지가 의미를 잃는다.
- 관리자가 직접 만든 글은 `DRAFT` 라 기본 필터에 안 잡힌다. 의도된 동작이다.
- 관심 없는 소재는 `반려`. 행이 남아 있어야 같은 사건을 다시 잡지 않는다.
- 목록의 출처 도메인은 `findSourceDomainsByArticleIdIn` 으로 **페이지 단위 한 번에** 읽는다.
  행마다 `article.getSources()` 를 건드리면 N+1 이 된다.

### 중복 판정은 본문에 기대지 않는다
`findDuplicateLead()` 세 단계: ① AI 가 만든 안정 키(`dedupeKey = release:{event_key}`)
② 첫 근거 URL 의 정규화 해시 ③ **근거 URL 이 겹치는 기존 글**.
③ 이 있어야 서로 다른 매체가 같은 사건을 다룬 경우를 잡는다 — 지우지 말 것.
의미 지문(`semantic_fingerprint`)은 본문에서 뽑던 값이라 `V94` 에서 없앴다.

### 수집 범위
신제품 출시·공개·국내 수입 + 이벤트(시음회·팝업·페어·클래스) + 어워드·수상.
리뉴얼·단종·가격 변동 같은 **기존 제품 변경은 제외**한다. 범위는 `news_prompts.py` 한 곳에 있다.

`news_prompts.py` 에 남은 규칙은 전부 **제목을 틀리지 않게** 하기 위한 것이다 —
고유명사 임의 번역 금지, 발표/공개/출시/판매 시점 구분, 해외 출시를 국내 출시로 오인 금지.
제목 한 줄이 되면서 이 규칙이 오히려 더 중요해졌다. 틀린 제목은 관리자를 헛수고시킨다.

### 출처는 관리자가 등록한 허용목록뿐이다
근거를 물어오는 경로는 등록 출처 하나뿐이고, 크롤러는 어떤 경우에도 출처 설정 행을 만들지 않는다.

- 예전에는 처음 보는 도메인마다 `ai_news_source_configs` 행을 만들었고(생산자 도메인은 `OFFICIAL` 로 자동 승격까지),
  게다가 검색이 도메인 무제한이라 주류와 무관한 도메인이 끝없이 쌓였다.
  그걸 사후에 걷어내려고 만든 것이 `V81` 의 소프트 차단(`blocked`)이었다.
  **자동 등록을 없앤 지금은 되살아날 행이 없어 차단 개념 자체가 사라졌다** — 삭제는 진짜 삭제다.
- 유일한 발견 경로는 `collect_registered_sources()`(`news_official.py`) 가 등록 출처를 직접 읽는 것뿐이다.
  **여기에 검색을 다시 넣지 말 것** — 도메인 무제한 검색이 문제의 출발점이었고, 등록 도메인으로 가뒀던
  제한 검색(Tavily)조차 쓸 만한 소재를 물어오지 않아 `V111` 에서 걷어냈다.
- 근거 URL 은 **반드시 개별 기사**여야 한다. 목록 페이지를 근거로 넣으면 안 된다.
  `findDuplicateLead()` 3단계가 "근거 URL 이 겹치는 기존 글"을 중복으로 보기 때문에, 목록 URL 을
  한 번 근거로 박으면 **그 출처는 두 번 다시 소재를 만들지 못한다.** 등록 출처가 N개면 평생 N건이다.
  실제로 2026-08-20 부터 그 상태였다. 기사를 하나도 못 얻은 출처는 목록 URL 을 제출하지 않고
  `NO_RESULT` 로 보고한다(`news_official.collect_registered_sources`).
- `V111` 은 `tavily_monthly_credit_limit`(설정)과 `tavily_credits`(사용량) 컬럼을 지웠지만
  `ai_news_usage` 의 `provider = 'TAVILY'` **행은 남겨 두었다.** 지난달 집계의 근거이고,
  크롤러가 더는 만들지 않으므로 옛 이력으로만 남는다. 지금 쓰이는 provider 는 `GEMINI` 뿐이다.
- 근거 이력은 원고별 `ai_news_article_sources` 에 남는다. 공개 글 하단 출처 표시와 JSON-LD `citation` 은
  이 테이블만 보므로 출처 설정 행이 없어도 문제가 없다.
- `auto_discovered` 컬럼은 남아 있지만 **아무도 `true` 로 만들지 않는다.** 관리자 화면의 '등록 경로' 필터가
  옛 행을 골라내는 용도로만 읽는다.

#### 목록이 아니라 기사를 읽는다 (`news_articles.py`)
등록된 URL 은 대개 **목록 페이지**다. 예전에는 그 페이지의 텍스트를 통째로 긁어 근거로 삼았는데,
세 가지가 한꺼번에 망가졌다.

1. 기사별 발행일을 알 수 없어 **'최근 것만'이라는 판단이 불가능**했다.
   `news_prompts.py` 의 "오래된 기사 제외" 규칙은 입력에 날짜가 없어 죽은 규칙이었다.
2. Gemini 에 넘기는 것은 앞 2,500자뿐인데, 목록 페이지 앞부분은 GNB·검색창·쿠키 배너다.
3. 근거 URL 이 매번 같아 위의 중복 잠금에 걸렸고, 관리자가 원문을 열 수도 없었다.

지금은 `discover_articles()` 가 **피드 → 사이트맵 → 목록 링크 추출** 순으로 시도하고
**처음 성공한 곳에서 멈춘다.**

- **피드가 첫 번째인 이유**는 발행일이 딸려 오기 때문이다. 기사를 열기 **전에** 최신성을 걸러
  요청을 아낀다. 링크 추출로 내려가면 날짜를 알 방법이 없어 열어 본 뒤에 거를 수밖에 없다.
- 피드 파싱은 **`xml.etree.ElementTree`** 를 쓴다. BeautifulSoup 의 `html.parser` 는 `<link>` 를
  빈 요소로 봐서 **RSS 의 기사 링크를 통째로 잃는다** — 여기에 BeautifulSoup 을 쓰지 말 것.
- 날짜는 JSON-LD `datePublished` → `article:published_time` 등 meta → `<time datetime>` →
  URL 경로의 `/2026/09/04/` 순으로 찾는다. **못 찾으면 버리지 않는다** — 메타 태그가 없는 매체를
  통째로 잃기 때문이고, 같은 기사를 다시 잡는 것은 서버의 근거 URL 중복 판정이 막아 준다.
- 최신 기사 기간은 관리자 설정 `recent_window_days`(기본 3)다. 환경변수가 아닌 이유는 배포 없이
  넓힐 수 있어야 해서다. 요청량 상한만 환경변수다 —
  `AI_NEWS_ARTICLES_PER_SOURCE`(기본 5), `AI_NEWS_MAX_ARTICLES_PER_RUN`(기본 20).
- 실행당 상한에 걸려 **확인하지 못한 출처는 수집 상태를 덮어쓰지 않는다.** 확인도 안 하고
  '결과 없음'으로 찍으면 관리자가 보는 상태가 거짓이 된다.
- 기사 요청은 모두 `safe_http` 를 지난다. SSRF 차단·리디렉션 도메인 검사·본문 2MB 제한이 그대로 걸리고,
  등록 도메인 밖으로 리디렉션되면 그 기사만 버린다.

#### 수집 대상은 `enabled` 하나로 정한다 — 출처 등급은 `V98` 에서 없앴다
등급(`source_type`: 공식/전문매체/커뮤니티/미승인)은 공개 화면에 한 번도 나온 적이 없다.
실제 역할은 `news_official.ELIGIBLE_TYPES` 로 수집 대상을 거르는 것뿐이었는데, 그건 `enabled` 가 이미 하던 일이다.

**스위치가 둘이라 관리자가 '수집 활성'을 켜 둔 출처가 등급 때문에 조용히 빠졌다.** 화면에는 활성으로 보이는데
아무것도 안 걸리니, 출처가 고장 난 것인지 설정 탓인지 구분할 방법이 없었다. 그래서 등급을 지우고 스위치를 하나로 줄였다.

- `V98` 은 컬럼을 지우기 전에 `공식/전문매체`가 아닌 행을 **비활성으로 내린다.** 이 문장이 없으면
  그동안 수집되지 않던 커뮤니티·미승인 출처가 갑자기 수집되기 시작한다.
- `ai_news_article_sources.source_type` 도 함께 사라졌다. 쓰는 곳이 없었다.
- **등급을 다시 만들지 말 것.** 필요한 건 "이 출처를 볼까 말까" 하나뿐이고, 그건 `enabled` 다.

#### 수집 상태는 성공·결과없음·실패 셋이다
`AiNewsSourceCrawlStatus` 에 `NO_RESULT` 가 있는 이유는, 예전에 성공과 결과없음이 뭉쳐 있었기 때문이다.
`collect_registered_sources()` 는 제한 검색이 정상 완료되기만 하면 **모든 출처를 SUCCESS 로 덮어썼다.**
그래서 등록 URL 이 깨진 출처도 화면에는 늘 '수집 성공'이었고, 검색으로만 확인하는 인스타그램 출처는
계정이 바뀌어도 성공으로 찍혔다 — `last_crawl_error` 는 저장돼 있었지만 아무도 볼 수 없었다.

판정은 `_report_crawl_results()`(`news_official.py`) 한 곳에 있다.

| 상태 | 뜻 |
|---|---|
| `SUCCESS` | 이번 실행에서 이 출처에서 **최근 기사**를 실제로 가져왔다 |
| `NO_RESULT` | 목록·피드는 정상이었지만 기간 안에 새 기사가 없었다. **실패가 아니다** |
| `ERROR` | 확인 자체가 실패했거나 **확인할 방법이 없다.** 사유를 `last_crawl_error` 에 남긴다 |

- 기사 단위로 내려가면서 **`NO_RESULT` 가 다시 의미를 갖는다.** 목록 페이지를 통째로 긁던 때는
  페이지만 읽히면 언제나 SUCCESS 였다 — 새 소식이 없다는 상태를 표현할 방법이 없었다.
- **직접 수집이 막힌 플랫폼은 `ERROR` 다**(`DIRECT_FETCH_BLOCKED_DOMAINS`, 지금은 인스타그램).
  검색으로 우회하던 경로가 사라져 확인할 방법이 없다. 조용히 `NO_RESULT` 로 넘기면 관리자는
  손쓸 수 없는 출처인 줄 모른 채 새 소식을 기다린다 — **사유를 남겨 실패로 보이게 한다.**
- **한 출처의 실패는 다른 출처를 덮지 않는다.** 일시적 실패는 다음 실행에서 성공으로 덮이므로,
  잠깐 실패로 보이는 편이 영원히 성공으로 보이는 것보다 낫다.
- 관리자 화면은 사유를 **툴팁이 아니라 표 안에** 찍는다(`CrawlStatus`, `AdminAiNewsPage.tsx`).
  `title` 속성에만 있으면 실질적으로 없는 것과 같았다.

#### 수집은 '간격'이 아니라 '시각'이다 (`V112`)
cron 은 `17 * * * *` 로 **매시간** 돌지만, 실제 수집 시각은
`ai_news_settings.collection_hours`(기본 `"9,18"`)다. 판정은 서버가 한다 — `internalConfig()` 가
`collectionDue` / `nextCollectionAt` 을 내려 주고, 크롤러는 그걸 보고 종료할지 정한다.

**왜 간격이 아니라 시각인가.** `collection_interval_hours` 로는 "하루 두 번, 09시와 18시"를 표현할 수
없다 — 09→18 은 9시간이고 18→09 는 **15시간**이다. 어떤 값을 넣어도 이 스케줄은 나오지 않는다.

판정 규칙은 `lastScheduledAt()` / `nextCollectionAt()`(`AiNewsService`) 두 개뿐이다.

```
dueAt = 지금까지 지나온 예정 시각 중 가장 최근 것 (오늘 것이 없으면 어제의 마지막 예정 시각)
collectionDue = 마지막 실행이 없거나, 마지막 실행이 dueAt 보다 앞선다
```

- **실제 실행은 09:17 · 18:17 이다.** 이 17분은 실수가 아니다. 핫딜 크롤러가 짝수 정각(`0 */2 * * *`)에
  돌아 18:00 정각이면 Gemini 무료 티어 호출이 겹친다. 그리고 매시간 확인이므로 09:17 실행이 죽어도
  **10:17 이 대신 수집한다** — 정각 cron 2줄로 바꾸면 이 재시도 그물이 사라진다.
- **오늘 지난 예정 시각이 없으면 어제의 마지막 시각을 쓴다.** 그래야 자정을 넘겨 처음 도는 실행이
  "어제 18시 차례를 이미 돌았는지"를 제대로 판단한다.
- **크롤러가 스스로 계산하지 않는 이유**: 마지막 실행 시각이 DB 에만 있고, 양쪽이 각자 계산하면 시각이 조용히 어긋난다.
- 차례가 아니면 크롤러는 **`ai_news_runs` 행을 만들기 전에** 끝낸다. 그래서 실행 이력 표의 간격이 곧 실제 수집 간격이다.
  건너뛴 실행을 행으로 남기면 이력이 의미를 잃는다.
- `startRun()` 이 `LocalDateTime.now(SERVICE_ZONE)` 을 쓰는 것도 이 때문이다. 시각 계산과 시계가 달라선 안 된다.
- 크롤러의 `config.get("collectionDue", True)` 기본값은 **배포 순서 때문**이다. API 가 아직 옛 버전이어도
  크롤러는 지금까지처럼 동작한다.
- 실행을 뜸하게 잡을수록 주종 순환(아래) 한 바퀴가 길어진다. 일일 한도는 시각과 무관하게 그대로 상한이다.

#### 저장했는지 중복이었는지를 응답이 말해 준다
`ingestLead()` 는 `LeadIngestResponse(created, id, status, dedupeKey)` 를 돌려준다.
크롤러의 사전 확인(`/dedupe`)은 ①dedupeKey ②정규화 URL 해시까지만 보고, **③근거 URL 겹침은 보지 않는다.**
그래서 사전 확인을 통과하고도 서버가 기존 원고를 돌려주는 경우가 있다.

`created` 가 없던 시절 크롤러는 응답에 `id` 가 있다는 이유로 그것도 '저장'으로 셌다 —
**실행 이력에는 검토 N건인데 새 원고는 0건**이었다. 크롤러는 `response.get("created", True)` 로 읽는다.
기본값 `True` 는 옛 API 와 붙어도 지금까지처럼 동작하게 하려는 것이다.

### 실행마다 주종 하나를 우선한다
한 번에 세 주종을 고르게 담으려 하면 근거가 가장 많은 위스키가 늘 이긴다. 그래서 실행마다 한 주종을
앞세운다. `rotation_category`(`news_official.py`)가 관리자 설정의 `whisky/wine/cognac_ratio`(기본 60/20/20)를
10슬롯으로 바꿔 순환한다 — 10회 중 위스키 6·와인 2·꼬냑 2. 실행 순번(`run_id`)만으로 정해지므로
따로 상태를 저장하지 않는다. **하루 2회(09·18시)면 한 바퀴가 5일**이라, 와인·꼬냑이 우선되는 실행은
5일에 한 번 온다.

- **순환은 무엇을 가져올지 정하지 않는다.** 수집은 등록 출처를 매번 전부 훑고, 이 값은
  `find_leads(..., focus_category)` 로 넘어가 **Gemini 가 소재를 고를 때의 우선순위**로만 쓰인다.
  제한 검색이 있던 시절에는 검색어 자체를 정했는데(399자 상한 안에서 세 주종이 서로 밀어냈다),
  그 검색이 사라지면서 역할이 줄었다.
- 일일 한도(`daily_release_limit`)는 발행이 아니라 **생성** 기준이다(`countCreatedSince`) —
  자동 발행이 없으니 발행 기준으로 세면 항상 0 이라 아무것도 막지 못한다.

### 정보 주제는 '내가 쓸 거리' 메모다
`ai_news_topics` 는 AI 가 다음에 쓸 글을 고르던 큐였다. 지금은 관리자가 직접 쓸 팁·정보 글을
잊지 않으려고 적어 두는 메모다 — 제목·주종·메모와 상태 둘(`PLANNED`/`DONE`)뿐이다.
정규화 키·동의어·재발행 허용·AI 제안 플래그와 중복 판정은 `V94` 에서 없앴다.
글을 발행하면 연결된 항목이 `DONE`, 반려·삭제하면 `PLANNED` 로 돌아온다.

## 유튜브 갤러리 (`/youtube`)
관리자가 **허락을 받고 등록한** 주류 유튜브 채널의 최신 영상·숏츠를 이미지 갤러리와 같은
타일 목록으로 보여 주는 기능. 영상은 우리 것이 아니라 **임베드**다.

- **Data API 키를 쓰지 않는다.** 수집은 유튜브 공개 RSS(`youtube.com/feeds/videos.xml`)뿐이고,
  **조회수·재생시간은 저장하지 않는다** — 값을 알 수 없고, 알아도 금세 낡아 화면과 구조화 데이터에
  거짓이 남는다. 이 결정 때문에 다음이 따라온다.
  - 피드는 **채널당 최신 15편**만 담는다. 그래서 자동 수집은 "새 영상 따라잡기"지 전량 수집이 아니다.
    오래된 대표 영상은 관리자가 영상 URL 로 직접 등록한다(`source = MANUAL`).
  - 숏츠 구분은 업로드 플레이리스트 갈래(`UULF…` 롱폼 / `UUSH…` 숏츠) RSS 로 한다.
    **유튜브가 문서로 보장한 규칙이 아니다.** 실패하면 채널 피드 하나로 떨어져 전부 `VIDEO` 가 되고,
    관리자가 목록에서 바로잡는다. 그래서 **자동 수집은 `video_type` 을 덮어쓰지 않는다**
    (`YoutubeVideo.applyFeedUpdate` 참고 — 여기에 videoType 을 추가하면 관리자 수정이 매번 되돌아간다).
  - 핸들(`@juryuhak`) → 채널 ID 해석과 프로필 이미지는 **채널 페이지 HTML 파싱**이다.
    ※ **읽기 상한(`MAX_HTML_BYTES`)을 낮추지 말 것.** 유튜브는 `<head>` 메타태그 *앞에* 1MB 가까운
    인라인 스크립트를 싣는다(2026-08 실측: 채널ID·og:image ≈ 720KB, 아바타 JSON ≈ 1,050KB 지점).
    예전 512KB 상한이 정확히 여기에 걸려 **프로필을 조용히 못 읽는 버그**를 냈다.
    채널 ID 와 프로필은 같은 문서에 있으므로 `fetchChannelPageInfo` 가 **한 번만** 받는다.
  - 등록 당시 프로필을 못 읽었거나 창작자가 바꾼 경우를 위해 관리자에 **'프로필 다시 가져오기'**
    (`POST /api/admin/youtube/channels/{id}/refresh-profile`)를 둔다. 채널을 지웠다 다시 만들면
    수집해 둔 영상과 노출 설정까지 날아가기 때문이다. 읽어 온 값이 없으면 기존 값을 **덮어쓰지 않는다**.
- **[보안] 관리자가 붙여 넣은 주소를 그대로 요청하지 않는다.** `YoutubeUrlParser` 는 URL 이 아니라
  식별자(핸들·채널ID·영상ID)만 돌려주고, 요청 주소는 `YoutubeFeedClient` 가 youtube.com 으로
  직접 조립한다. 이 구조를 깨면 관리자 입력이 곧 서버의 외부 요청 대상이 되어 SSRF 통로가 된다.
- **노출 조건은 `채널.is_visible AND 채널.permission_confirmed AND 영상.is_visible` 셋 다**이다.
  허락 확인(`permission_confirmed`)이 노출의 전제이며, 판정은 `YoutubeChannel.isPubliclyVisible()`
  과 `YoutubeChannelRepository.findPublicChannels()` / `YoutubeVideoRepository` 의 쿼리들이
  **같은 규칙을 반복**한다 — 한쪽만 바꾸면 목록·상세·사이트맵이 어긋난다.
  창작자가 동의를 철회하면 채널 하나만 내려도 그 채널 영상이 전부 사라진다.
- 자동 수집분(`CHANNEL_FEED`) 삭제는 **숨김으로 처리**한다(`YoutubeAdminService.deleteVideo`).
  지워도 다음 수집에서 되살아나므로 삭제가 실제로 원하는 동작이 아니다.
- **수집은 넣거나 갱신만 하고 지우지 않는다**(`YoutubeSyncWriter.persistFeed`).
  RSS 창(채널당 15편)은 밀려도 DB 는 누적되므로 한 번 들어온 영상은 계속 남는다.
  대신 창 밖으로 나간 영상은 제목·썸네일이 더 갱신되지 않는다.

### 삭제·비공개 영상 자동 숨김 (`YoutubeAvailabilityService`)
RSS 는 최신 15편만 담아 **옛 영상이 지워졌는지 알려 주지 않는다.** 그래서 목록에는 뜨는데
눌러 보면 "동영상을 재생할 수 없음"이 나오는 카드가 시간이 갈수록 쌓인다. 이를 막는 정기 점검이다.
- 판정은 **oEmbed 응답 코드**다 — 200 정상 / 404 삭제 / 401·403 비공개·재생제한.
  그 밖(429·5xx·네트워크 오류)은 `UNKNOWN` 이고 **아무것도 바꾸지 않는다.**
  유튜브가 잠깐 느린 것과 영상이 지워진 것을 섞으면 멀쩡한 영상이 통째로 사라진다.
- **`auto_hidden` 이 관리자 숨김과 자동 숨김을 가른다.** 자동으로 내린 것만 되살리고,
  관리자가 의도적으로 숨긴 영상은 점검이 건드리지 않는다. 관리자가 노출을 직접 바꾸면
  (`YoutubeVideo.updateVisibility`) `auto_hidden` 은 항상 꺼진다 — 안 그러면 관리자가 되살린
  영상을 다음 점검이 또 내린다.
- 대상은 **오래 확인 안 한 것부터** 상한(`max-per-run`, 기본 300)만큼만. 영상이 늘어도 한 번의
  실행 시간이 길어지지 않고 전체가 순번대로 돌아간다. 확인 실패한 영상은 점검 시각을 남기지
  않아 다음 실행에서 먼저 온다.
- 상태 전이는 `YoutubeAvailabilityWriterTest` 가 못 박아 둔다 — 여기가 틀리면 멀쩡한 영상이
  사라지거나 숨긴 영상이 되살아나는데, 둘 다 화면을 열어 보기 전에는 드러나지 않는다.
- 임베드는 `youtube-nocookie.com` 이고, **누르기 전에는 iframe 을 만들지 않는다**(`YoutubeEmbed`).
  재생 전까지 제3자 요청을 보내지 않기 위한 것이라 썸네일-우선 구조를 유지할 것.
- **재생 화질은 플레이어 크기로만 올릴 수 있다.** 유튜브는 iframe 이 실제로 그려진 크기를 보고
  화질을 고르며, 화질 지정 파라미터(`vq`)와 IFrame API 의 `setPlaybackQuality()` 는 오래전부터
  무시된다. 그래서 팝업 폭이 1280px 다 — **여기를 좁히면 그만큼 화질이 내려간다.**
- **조작 버튼(닫기·앞뒤)은 플레이어 위에 겹치지 않는다.** 유튜브가 자기 오버레이(제목 막대·설정
  톱니바퀴·나중에 볼 동영상)를 우상단에 그려 서로 가린다. 우리 버튼은 플레이어 **위쪽 별도 막대**에 둔다.
- 썸네일은 영상 ID 로 만든다(`youtubeThumbnail.ts`). `maxresdefault`(1280×720)를 먼저 쓰고
  없는 영상은 `onError` 또는 120×90 Not Found 이미지의 `onLoad` 감지로 `hqdefault` 로 되돌린다.
  **두 핸들러 중 하나라도 빼면 환경에 따라 깨진 이미지가 남는다.**
  `hqdefault` 는 항상 480×360(4:3)이고 실제 영상이 가운데 들어가므로, `object-cover` 로 자르면
  16:9·9:16 어느 쪽이든 원본 프레임만 남는다.
- 트랜잭션: 유튜브 호출은 **트랜잭션 밖**에서 끝내고 쓰기는 `YoutubeSyncWriter`·`YoutubeAdminWriter`
  (별도 빈)가 맡는다. 같은 클래스의 메서드로 합치면 자기 호출이라 `@Transactional` 프록시가 걸리지 않는다.
- **색인 대상 주소는 목록 `/youtube` 하나뿐이다.** 채널 `/youtube/channels/{핸들|채널ID}` 과
  영상 `/youtube/{videoKey}`(DB PK 가 아니라 **유튜브 영상 ID**)는 `noindex, follow` 이고
  사이트맵에도 싣지 않는다. 세 주소 모두 사람이 공유하는 주소로는 계속 살아 있다.
  - 이유: 채널·영상 페이지는 제목·설명·썸네일이 전부 남의 영상에서 온 값이라 색인 자산이 아니다.
    2026-08 감사에서 이 1,500여 건이 사이트맵의 41%를 차지해 크롤 예산을 잠식하고 있었다.
  - **`nofollow` 는 붙이지 않는다.** 영상 페이지가 태그된 주류로 내보내는 링크가 갤러리에서
    카탈로그로 가는 크롤 경로다. 그래서 `proxy.ts` 의 `X-Robots-Tag`(noindex, **nofollow**)
    목록에 `/youtube` 를 넣으면 안 된다.
  - noindex 라우트라 **라우트 JSON-LD 를 싣지 않는다.** `SeoMeta.syncRouteJsonLd` 가 noindex 일 때
    스키마를 비우고 SSR 스크립트를 지우므로, 서버에만 남기면 SSR↔DOM 이 어긋난다.
  - 판정은 세 곳이 함께 맞춰야 한다: SSR(`seoHelpers.getYoutube{Video,Channel}Metadata`),
    클라이언트(`Youtube{VideoDetail,Channel}Page` 의 `SeoMeta noindex`),
    사이트맵(`SitemapService.generateSitemapIndex`). 하나만 바꾸면 하이드레이션 후 뒤집힌다.
  - 목록의 필터·검색 주소(`?type`·`?q`·`?spirit`·`?v`)는 본 목록과 겹쳐 noindex 다.
- **채널별 목록은 갤러리 필터가 아니라 채널 페이지가 맡는다.** 예전에는 갤러리 상단 카드가
  `?channel=` 로 그 자리에서 걸러 주기만 했는데, 주소가 갤러리와 같아 검색엔진에 채널이 하나도
  드러나지 않았다. 채널 카드·영상 팝업의 채널명은 모두 `/youtube/channels/…` 로 간다.
  핸들이 없는 채널도 있어 서버는 **핸들과 채널 ID 를 모두** 식별자로 받는다(`findPublicByRef`).
- 주류 태그(`youtube_video_spirit_tags`)는 `post_spirit_tags` 와 같은 구조다. 태그하면 주류 상세에
  '관련 영상'이 뜨고 갤러리에서 `?spirit=` 로 걸러진다 — 갤러리와 카탈로그를 잇는 내부 링크다.

## 주류 정보 조사 프롬프트 (docs/*-research-prompt.md)
관리자가 AI에게 주류 정보를 조사시켜 **관리자 > 주류 등록 폼에 그대로 옮겨 적기 위한** 프롬프트 모음.
카테고리별로 3개다 — `docs/cognac-research-prompt.md` · `docs/whisky-research-prompt.md` · `docs/wine-research-prompt.md`.

- **이 문서들은 등록 폼의 사본이다.** 허용 값(enum)·길이 제한·필수 여부를 코드와 1:1로 옮겨 적어 뒀다.
  프롬프트가 코드보다 낡으면 AI가 **저장되지 않는 값**을 만들어 오고, 그걸 눈으로 걸러야 한다.
- ※ **아래를 바꾸면 해당 프롬프트 문서도 같은 PR 안에서 반드시 함께 고친다.**

| 바뀐 것 | 함께 고칠 문서 |
|---|---|
| `CognacGrade` · `CognacCru` · `CognacOakType`, `caskbycask-web/src/domain/spirit/data/cognac.ts` | cognac |
| `WhiskyStyle`, `BROAD_CASK_CATEGORIES`(`WhiskyDetailSection.tsx`), 에디션 유형(`SpiritFormFields.tsx`), 병입 구분 OB/IB | whisky |
| `WineType` · `WineVintageStatus` · `WineCertification`, 관능 5단계(`wineTasteScale.ts`), 수확 방법 · 발효 용기 · 오크 종류 선택지(`WineDetailSection.tsx`) | wine |
| `WineRegion` enum 의 산지 코드 추가·삭제·이름 변경 | 해당 카테고리 전부 |
| `spiritLimits.ts` / `SpiritLimits.java` 의 도수 · 용량 · 연도 범위 | 3개 전부 |
| 각 `*DetailRequest.java` 의 `@Size`·`@Min`·`@Max` 및 record 필드 추가·삭제 | 해당 카테고리 |
| 카테고리별로 숨기는 필드 규칙(`hasCommonDetailFields`, `dropAging`, 위스키 전용 게이팅) | 해당 카테고리 |

- 각 문서 상단에 그 카테고리가 참조하는 소스 경로 목록이 있다. **소스를 옮기면 그 목록도 갱신**할 것.
- 위스키 프롬프트의 **에디션 조사 기준 연도**("2023년 이후")는 최근 3년을 뜻한다.
  해가 바뀌면 문서 상단 안내대로 프롬프트 본문의 연도를 직접 올린다.
- 프롬프트 본문은 ` ```` ` 4중 백틱 블록 안에 있다 — 안에 3중 백틱 코드펜스가 들어가기 때문이다. 구조를 깨지 말 것.

## 주류 등록 요청 (사용자 → 관리자)
사용자 「술 등록 요청」(`/request/spirit`)과 관리자 「주류 등록」은 **폼 한 벌을 공유**한다 —
`SpiritFormFields.tsx` / `useSpiritForm()`. 술 데이터 항목을 추가·변경할 때는 이 파일만 고치면
관리자 3화면(등록·수정·요청검토)과 사용자 화면까지 한 번에 반영된다.

- ⚠️ **사용자 화면은 「최소 정보 모드」다** — `useSpiritForm({ ..., simple: true })`.
  받는 것은 카테고리 · 이름(한/영) · 도수 · 용량 · (위스키)스타일 · 생산자 · 국가가 전부다.
  상세·캐스크·에디션 카드는 렌더하지 않고, **그 카드에서 파생되는 검증도 같이 끈다.**
  일반 이용자는 숙성 연수·캐스크·와인 상세를 알기 어렵고, 비워 보내나 틀리게 보내나
  결국 관리자가 승인 화면에서 다시 채운다 — 그래서 아예 묻지 않는다.
  - **`simple` 은 훅이 돌려주고 컴포넌트가 `form.simple` 로 읽는다**(렌더 전용 prop 이 아니다).
    렌더만 끄면 화면에 없는 칸의 오류로 제출 버튼이 먹통이 되고, 검증만 끄면 서버가 400 을 낸다.
    둘이 갈라지지 않게 한 값에서 나와야 한다.
  - 서버도 짝을 맞춰야 한다. `SpiritRegisterRequestBody` 의 `hasCategoryCore()` 는 **위스키 스타일만**
    요구하고(와인 종류·꼬냑 등급·기타 주종은 입력칸이 없다), 숙성연수 택1 검증(`hasAgeChoice`)은 없앴다.
    한쪽만 되돌리면 그 카테고리 요청이 통째로 400 이 된다.
- 사용자는 생산자를 즉석에서 만들 수 없고 **승인 대기 큐**로만 넣는다(`allowPendingProducer`).
  생산자 요청 종류는 카테고리에 맞춰 보낸다 — `OTHER` 로 고정해 보내면 승인돼도 그 카테고리
  생산자 목록에 나타나지 않는다.
  - ⚠️ id 가 없을 때는 **입력한 이름을 `producerName` 으로 함께 보내야 한다.** 예전에는 이름을
    클라이언트 검증에만 쓰고 전송하지 않아, 관리자 검토 화면에 생산자가 **빈 칸으로 도착**했다.
    서버 `hasProductionInfo()` 도 `producerId` 또는 `producerName` 중 하나를 요구한다.
- 제출 형태도 다르다: 사용자는 **평탄화 DTO + 멀티파트 이미지**,
  변환은 `spiritFormAdapters.ts` 가 전담한다. 와인은 상세가 마스터가 아니라 **빈티지(에디션)** 에
  있으므로 어댑터가 `variant.wineDetail` 을 우선해야 한다 — 마스터 값을 보내면 상세가 통째로 사라진다.
  (이 규칙은 관리자 폼에서 넘어오는 페이로드용이다. 사용자 화면은 에디션 카드를 쓰지 않는다.)

### 기존 주류에 에디션 추가 (`targetSpiritId`)
요청 본문에 `targetSpiritId` 가 실려 있으면 승인이 **새 마스터가 아니라 그 주류의 하위 에디션**을 만든다.

- 사용자는 등록 요청 화면에서 주류를 검색해 고르고(**위스키만**), 관리자는 검토 화면에서
  직접 찾거나 바꿀 수 있다. 두 화면이 `SpiritMasterPicker` **하나**를 공유한다
  (`includeVariants=false` 라 마스터만 나온다 — 에디션을 붙일 대상은 언제나 마스터다).
  - 와인을 빼 둔 이유: 서버 `validateWineVariants` 가 빈티지 식별값을 **연도 또는 `NV`** 로 강제한다.
    자유 입력 식별값을 받는 이 화면과 맞지 않아 승인 시점에 막힌다. 와인 빈티지는 새 주류 요청으로 받는다.
- **사용자가 적는 것은 식별값(한/영) 뿐이다.** 에디션 유형·시리즈 식별자는 고른 마스터에서
  `deriveMasterEditionInfo()` 로 뽑아 되돌려 보낸다 — 서버의 `resolveVariantTypeForUserCreate` /
  `resolveSeriesIdentifierForUserCreate` 와 **같은 규칙**이라야 화면과 승인 결과가 어긋나지 않는다.
  아직 에디션이 갈리지 않은 마스터면 유형이 비어 가고, 관리자가 승인 화면에서 확정한다
  (그래서 `hasVariantForTarget()` 은 `variantValue` 만 요구한다).
  - 식별값은 `variants[]` 가 아니라 **화면 상태**로 들고 있다가 제출 직전에 평탄화 DTO 에 얹는다.
    에디션 카드를 쓰면 시리즈 식별자·에디션별 숙성연수까지 필수가 되는데, 그 칸이 이 화면에는 없다.
  - 관리자 검토 화면의 `prefillFromRequest` 는 `variantType` 이 비어 있어도 위스키면 `BATCH` 로
    폴백해 시딩한다. 폴백을 지우면 **신청자가 적은 식별값이 관리자 화면에서 통째로 사라진다.**
- 승인 엔드포인트가 갈린다: `POST /requests/{id}/approve` (새 마스터) /
  `POST /requests/{id}/approve-as-variant/{targetSpiritId}` (기존 주류의 에디션).
  본문은 같은 폼 페이로드다.
- 이름·생산자·국가·산지는 서버가 **마스터에서 복사**한다. 그래서 이 모드에서는 생산 정보 카드를 숨기고
  이름 2칸을 **입력칸이 아니라 정적 텍스트로** 보여준다(`identityLocked`).
  `readOnly` 입력칸은 일반 입력칸과 똑같이 생겨서 고칠 수 있는 것처럼 보이는데, 고쳐 봐야 덮어쓰인다.
- 대상 주류가 아직 에디션 분리 전이면 승인 시 `promoteToVariantMaster` 로 승격한다.
  같은 에디션 값이 이미 있으면 `SPIRIT_015` 로 막는다.
- **요청 본문은 `spirit_register_request.spirit_data` JSON 컬럼에 통째로 직렬화된다.**
  그래서 요청 필드 추가에는 마이그레이션이 필요 없다(엔티티를 건드리지 않으므로).

### 헷갈리기 쉬운 것 — 큐가 둘이다
| 화면 | 무엇을 만드나 | 엔티티 |
|---|---|---|
| 주류 등록 요청 (`/admin/spirits/requests`) | 새 마스터 주류, 또는 기존 주류의 에디션 | `SpiritRegisterRequest` |
| 하위 에디션/리뷰 승인 (`/admin/spirits/variant-requests`) | 리뷰 작성 중 추가된 에디션 + 리뷰 | `SpiritVariantReviewRequest` |

두 흐름은 목적도 데이터 모델도 다르다. 한쪽을 고칠 때 다른 쪽을 같이 건드리지 말 것.

- 회귀 방지: `npm run admin:verify-form` (최소 정보 모드의 렌더↔검증 짝맞춤, 폼 옵션,
  `producerName`·식별값·`targetSpiritId` 제출, 와인 상세 경로, 관리자 컬럼 레이아웃).

## 관리자 라우트를 추가할 때
관리자 화면은 **세 곳**에 등록해야 한다. 하나라도 빠지면 증상이 제각각이라 찾기 어렵다.
1. `App.tsx` 라우트 — 없으면 화면 자체가 안 뜬다.
2. `adminMenu.ts` (`ADMIN_NAV`) — 없으면 사이드바·권한 체크리스트에 안 보인다.
3. **`seoHelpers.ts` 의 `isKnownAdminPath` 화이트리스트** — 없으면 SPA 안에서 이동할 때는
   멀쩡한데 **그 주소를 직접 열거나 새로고침하면 404** 가 난다(SSR 이 not-found 로 판정).
   화면을 클릭해 보는 것만으로는 드러나지 않는다.
- 회귀 방지: `npm run test:admin-menu` 가 1↔3 불일치를 잡는다.

## 관리자 화면 용어 규칙
- 주류는 **'주류'** 로 쓴다(사이드바·페이지 제목·확인창 모두). '술'은 쓰지 않는다.
- 사이드바 라벨과 페이지 `h1`·breadcrumb 은 **같은 말**을 써야 한다. 한쪽만 바꾸면 어긋난다.
- 메뉴 라벨이 실제 기능 범위를 좁게 말하면 안 된다 —
  테이스팅 트리는 전 카테고리 공통이라 `주류 트리`(과거 '위스키 트리'),
  커뮤니티 신고는 댓글까지 다루므로 `게시글·댓글 신고`.
- 메뉴 키는 라우트 `path` 다. **라벨을 바꿔도 권한 데이터(`allowedMenus`)는 영향받지 않는다.**
- 회귀 방지: `npm run test:admin-menu`.

## 사용자 GNB 메뉴 (노출/미노출 관리)
사용자 화면 상단 GNB 는 **메뉴 목록은 코드가, 노출 여부는 DB 가** 소유한다.
관리자 `사용자 메뉴 노출`(`/admin/gnb-menus`)에서 메뉴를 켜고 끈다.

- 카탈로그 단일 소스는 `caskbycask-web/src/domain/gnb-menu/constants/gnbMenu.ts` (`GNB_MENUS`).
  `MainLayout` 의 GNB·드롭다운·`sr-only` 미러 내비게이션과 관리자 화면이 **모두 이 배열 하나**를 쓴다.
  메뉴를 추가할 때 손댈 곳: ① `GNB_MENUS` ② `ko.json`/`en.json` 의 `labelKey` ③ `App.tsx` 라우트.
- ⚠️ **`key` 는 `gnb_menu_settings.menu_key` 에 그대로 저장되는 값이다.** 키를 바꾸면 저장된 설정이
  끊겨 관리자가 숨겨 둔 메뉴가 조용히 되살아난다. 라벨·경로는 자유롭게 바꿔도 되지만 key 는 고정.
- **행이 없으면 노출**이 기본값이다(그래서 V91 에 seed 가 없다). 새 메뉴는 마이그레이션 없이 바로 보이고,
  백엔드는 유효한 키 목록을 모른다 — `adminMenu.ts` 의 `allowedMenus` 와 같은 방식이다.
  카탈로그에서 사라진 옛 키의 행이 남아도 프론트가 무시한다.
- 필터 규칙(`filterVisibleGnbMenus`): 부모를 끄면 하위까지 사라지고, **자식이 전부 숨겨진 그룹은
  그룹 버튼도 사라진다**(안 그러면 눌러도 빈 드롭다운만 열린다).
- **`app/layout.tsx` 의 `window.__GNB_HIDDEN__` 시드를 제거하지 말 것.** SPA 는 마운트 첫 프레임에
  노출 설정을 몰라, 시드가 없으면 숨긴 메뉴가 매 페이지 로드마다 깜빡인다. 조회 실패 시에는 빈 배열 =
  전 메뉴 노출로 떨어진다(메뉴가 통째로 사라지는 것보다 안전한 방향). 직렬화의 `<` 이스케이프는
  `</script>` 조기 종료 방지용이다.
- **미노출은 메뉴에서 숨기는 것뿐이다.** 페이지 URL·sitemap·SEO 는 건드리지 않는다 —
  주소를 직접 열거나 기존 링크·검색으로 들어오면 그대로 보인다.
- 관리 대상이 아닌 것: GNB 우측 **이벤트 달력 버튼**, 모바일 하단 탭(`BottomNav`), 푸터, 헤더 유틸.
- 회귀 방지: `npm run test:gnb-menu` (키 스냅샷·번역키·필터 규칙·SSR 시드·이중 소스 방지).

## 응답은 한국어로 해줘.
## Git 규칙
- 절대로 임의로 commit, push, branch 생성, merge 하지 말 것.
- Git 명령은 사용자의 명시적인 요청이 있을 때만 수행.

## Query 작성 원칙
- Spring Data JPA + QueryDSL을 우선 사용.
- Native Query는 불가피한 경우만 사용.
- N+1 문제를 항상 고려한다.

## DB 변경
- Entity 수정 시 반드시 Flyway Migration 생성.
- 기존 Migration 수정 금지.
- 새로운 Migration만 추가.

## 구현 원칙
- 기존 기능에 영향이 있는 경우 반드시 먼저 설명한다.
- 확신이 없으면 추측하지 말고 질문한다.

# 운영 서비스 주의사항
현재 실제 운영 중인 서비스이다.
기존 기능이 변경될 가능성이 있는 작업은 반드시 영향 범위를 먼저 설명한 후 수정한다.
추측해서 구현하지 말고, 불명확한 요구사항은 질문 후 구현한다.
