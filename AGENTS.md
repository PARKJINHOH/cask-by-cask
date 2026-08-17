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
  - **KRW 만 허용**한다. 차트가 deal 금액을 환율 환산 없이 원화로 집계하기 때문(`buildTempPrices`).
    외화 가격은 환율 스냅샷을 저장하는 **가격 제보** 경로를 써야 한다.
  - 관측일(`observedAt`)을 `crawled_at` 에 저장한다 — 차트 X축이 `crawledAt ?: createdAt` 이다.
  - 등록자에게 **점수를 주지 않는다**(제보 점수는 `price_reports` 승인 시에만 지급).
- 관리자 화면은 `/admin/deals/new` 가 `AdminDealDetailPage` 의 **등록 모드**를 재사용한다
  (주류 검색·배치 선택 로직을 복제하지 않기 위함). 정적 경로라 `deals/:id` 보다 먼저 매칭된다.

## 소식(AI) 출처 — 자동 등록과 차단
`ai_news_source_configs` 는 관리자 설정이면서 **AI 가 인용한 도메인의 발견 기록**이기도 하다.
`AiNewsService.resolveSource()` 가 기사 수집 시 처음 보는 도메인마다 행을 자동 생성하기 때문이다
(`auto_discovered = true`, 미승인 등급). 크롤러의 일반 Tavily 검색은 도메인을 제한하지 않으므로
주류와 무관한 도메인도 이렇게 들어온다.

- **자동 등록 출처의 삭제는 hard delete 가 아니라 `blocked` 로 남긴다**(`V81`).
  행을 지우면 다음 수집에서 `resolveSource` 가 같은 도메인을 다시 등록해 삭제가 되돌려진다.
  차단 행이 남아 있으면 첫 분기에서 걸려 재등록도, 생산자 도메인 자동 승격도 일어나지 않는다.
- 관리자가 직접 등록한 출처(`auto_discovered = false`)는 지금처럼 완전 삭제된다.
- `V81` 백필은 기존 행 중 **미승인 등급만** 자동 등록으로 표시한다. 생산자 도메인 자동 승격으로 만들어진
  기존 공식 출처는 표시가 없어 첫 삭제가 hard delete 지만, 다시 등록될 때 `auto_discovered = true` 가
  붙으므로 **두 번째 삭제부터는 차단으로 남는다**(자가 치유). 이 때문에 백필을 더 넓히지 않았다.
- 출처 목록 API 는 **`blocked` 를 지정하지 않으면 차단 행을 숨긴다**(삭제된 원고를 숨기는 `listArticles` 와 같은 규칙).
  차단된 URL 을 다시 등록하려 하면 스코프 중복으로 막히므로, 관리자는 상태 필터 `차단됨`에서 찾아 해제해야 한다.
- 차단 목록은 `GET /api/internal/ai-news/config` 의 `blockedSources` 로 크롤러에 내려간다.
  크롤러는 `_drop_blocked_sources`(`news_main.py`)로 **검색 결과 단계에서** 걸러 원고 근거로 쓰이지 않게 한다.
  단, 관리자가 AI 작성 요청에 직접 넣은 참고 URL 은 거르지 않는다.

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
  없는 영상은 `onError` 로 `hqdefault` 로 되돌린다 — **`onError` 를 빼면 깨진 이미지가 남는다.**
  `hqdefault` 는 항상 480×360(4:3)이고 실제 영상이 가운데 들어가므로, `object-cover` 로 자르면
  16:9·9:16 어느 쪽이든 원본 프레임만 남는다.
- 트랜잭션: 유튜브 호출은 **트랜잭션 밖**에서 끝내고 쓰기는 `YoutubeSyncWriter`·`YoutubeAdminWriter`
  (별도 빈)가 맡는다. 같은 클래스의 메서드로 합치면 자기 호출이라 `@Transactional` 프록시가 걸리지 않는다.
- **색인 대상 주소는 셋**이다. 목록 `/youtube`, 채널 `/youtube/channels/{핸들|채널ID}`,
  영상 `/youtube/{videoKey}`(DB PK 가 아니라 **유튜브 영상 ID**). 모두 `/sitemaps/youtube.xml`
  에 실리고 서버 렌더 JSON-LD 가 붙는다(`seoHelpers.getYoutube*JsonLd`).
  - `VideoObject` 의 `publisher` 는 우리가 아니라 **채널**이고 `contentUrl` 은 쓰지 않는다
    (우리가 호스팅하는 파일이 아니다). 채널 페이지는 `CollectionPage.about` 이 채널이고
    `sameAs` 로 유튜브 채널 홈을 가리킨다 — 우리가 채널 본인인 척하지 않기 위해서다.
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