# 와인 정보 조사 프롬프트

관리자 > 주류 > 와인 등록 폼에 그대로 옮겨 적을 수 있는 형태로 AI에게 조사를 시키는 프롬프트다.
아래 블록 전체를 복사해 AI에 붙여넣고, 마지막 `## 조사 대상`에 제품명을 적으면 된다.

- 꼬냑용 — [`cognac-research-prompt.md`](./cognac-research-prompt.md)
- 위스키용 — [`whisky-research-prompt.md`](./whisky-research-prompt.md)

허용 값(enum)은 코드와 1:1로 맞춰져 있다. 값을 바꿀 때는 아래 소스도 함께 고쳐야 한다.

- 와인 종류·인증·수확/발효/오크 선택지 — `caskbycask-web/src/domain/admin/components/WineDetailSection.tsx`
- 관능 5단계 척도 — `caskbycask-web/src/domain/spirit/data/wineTasteScale.ts`
- 산지 코드 — `caskbycask-api/.../entity/enums/WineRegion.java` (카테고리 미지정 = 와인 기본값)
- 길이·범위 제약 — `.../dto/WineDetailRequest.java`

**와인은 다른 카테고리와 달리 공통 상세(숙성연수·증류/병입연월·출시일·배치번호·병번호·총병수)가
폼에서 전부 숨겨진다.** 빈티지가 그 역할을 대신한다. 프롬프트도 그에 맞춰 해당 필드를 요구하지 않는다.

---

## 프롬프트 (아래부터 복사)

````
당신은 와인 전문 리서처입니다. 제가 운영하는 주류 리뷰 사이트의 DB에 등록할 제품 정보를
조사해 주세요. 등록 폼에 그대로 옮겨 적을 수 있도록 **정해진 형식**으로만 답하세요.

# 절대 규칙

1. **추측 금지.** 확인되지 않은 값은 반드시 `null`로 두세요. 그럴듯한 값을 채우는 것보다
   비워두는 것이 낫습니다. 이 데이터는 사용자에게 사실로 제시됩니다.
2. **출처 필수.** 제품마다 참고한 출처를 URL로 남기세요. 우선순위는
   ① 생산자(도멘/샤토) 공식 사이트 → ② 국내 공식 수입사 → ③ Wine-Searcher·Vivino·CellarTracker
   → ④ 전문 매체(Decanter, Wine Advocate 등) 순입니다.
3. **허용 값만 사용.** 아래 목록에 없는 값은 절대 쓰지 마세요. 해당 값이 없으면 `null`입니다.
4. **한국어 이름은 원어 발음이 아니라 국내 통용 표기를 따릅니다.** 아래 "한국어 이름 규칙" 참고.
5. **빈티지가 다르면 다른 제품입니다.** 특정 빈티지를 지정받았으면 그 빈티지의 정보를 조사하세요.
   빈티지 지정이 없으면 최근 유통되는 빈티지를 쓰고 `_uncertain`에 어느 빈티지 기준인지 적으세요.

# 한국어 이름 규칙

와인은 프랑스어·이탈리아어 명칭이 많아 **원어 발음과 국내 표기가 다릅니다.**
발음을 그대로 옮기지 말고, **한국에서 실제로 쓰이는 표기**를 찾아서 쓰세요.

## 표기 결정 순서

1. **국내 공식 수입사 표기** — 가장 우선. 신세계L&B, 나라셀라, 금양인터내셔날, 아영FBC,
   레뱅드매일, 하이트진로, 롯데칠성 등의 제품 페이지·보도자료
2. **국내 와인 리테일** — 데일리샷, 와인앤모어, 이마트/트레이더스, 보틀벙커
3. **국내 와인 매체·커뮤니티 통용 표기** — 위 둘에서 확인되지 않을 때만

세 곳 모두에서 확인되지 않으면 외래어 표기법에 따라 음차하되, `_uncertain`에
"국내 표기 미확인 — 음차"라고 반드시 적으세요.

## 검증된 표기 예시

| 영문/원어 | 국내 표기 | 흔한 오표기 |
|---|---|---|
| Château Margaux | 샤토 마고 | ~~샤토 마르고~~ |
| Château Lafite Rothschild | 샤토 라피트 로칠드 | ~~라피테 로스차일드~~ |
| Château Mouton Rothschild | 샤토 무통 로칠드 | ~~모우톤~~ |
| Domaine de la Romanée-Conti | 도멘 드 라 로마네 콩티 | ~~로마니 콘티~~ |
| Gevrey-Chambertin | 주브레 샹베르탱 | ~~게브레이 챔버틴~~ |
| Puligny-Montrachet | 퓔리니 몽라셰 | ~~풀리니 몬트라쳇~~ |
| Châteauneuf-du-Pape | 샤토뇌프 뒤 파프 | ~~샤토네우프~~ |
| Côte-Rôtie | 코트 로티 | ~~코테 로티에~~ |
| Hermitage | 에르미타주 | ~~허미티지~~ |
| Sancerre | 상세르 | ~~산세르~~ |
| Pouilly-Fuissé | 푸이 퓌세 | ~~포일리 푸이세~~ |
| Dom Pérignon | 돔 페리뇽 | ~~돔 페리그논~~ |
| Veuve Clicquot | 뵈브 클리코 | ~~베우베 클리쿼트~~ |
| Moët & Chandon | 모엣 샹동 | ~~모에트 챈든~~ |
| Ruinart | 뤼나르 | ~~루이나르트~~ |
| Sassicaia | 사시카이아 | |
| Tignanello | 티냐넬로 | ~~티그나넬로~~ |
| Brunello di Montalcino | 브루넬로 디 몬탈치노 | |
| Vega Sicilia | 베가 시실리아 | |
| Penfolds Grange | 펜폴즈 그랜지 | |
| Opus One | 오퍼스 원 | |
| Cloudy Bay | 클라우디 베이 | |

**이 표를 근거로 삼되 맹신하지 마세요.** 표에 없는 생산자는 위 순서대로 직접 확인하세요.

## 이름 구성

`nameKo`는 `생산자 + 제품명 + 빈티지` 형태로 씁니다.
- `샤토 마고 2018`, `펜폴즈 그랜지 2017`, `클라우디 베이 소비뇽 블랑 2023`
- 논빈티지(샴페인 등)는 연도를 빼거나 `NV`를 씁니다 — `뵈브 클리코 옐로라벨 NV`

# 출력 형식

제품 1개당 아래 JSON 객체 하나. 여러 개면 JSON 배열로 묶으세요.
JSON 외의 설명은 배열 뒤에 `## 메모`로 따로 적으세요.

```json
{
  "category": "WINE",
  "nameKo": "샤토 마고 2018",
  "nameEn": "Château Margaux 2018",
  "producer": { "nameKo": "샤토 마고", "nameEn": "Château Margaux" },
  "country": "프랑스",
  "region": "보르도",
  "regionCode": "FR_BORDEAUX_MEDOC",
  "abv": 13.5,
  "volumeMl": 750,

  "wineType": "RED",
  "vintageStatus": "VINTAGE",
  "vintageYear": 2018,

  "grapeVarieties": [
    { "name": "Cabernet Sauvignon", "percentage": 90 },
    { "name": "Merlot", "percentage": 4 },
    { "name": "Cabernet Franc", "percentage": 3 },
    { "name": "Petit Verdot", "percentage": 3 }
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

  "notes": "보르도 1855년 등급의 1등급(프리미에 크뤼) 다섯 곳 중 하나이며, 마고 아펠라시옹을 대표하는 샤토의 그랑 뱅이다. 2018년은 좌안에서 개화기 강우와 여름 가뭄을 거쳐 폴리페놀이 두텁게 쌓인 해로 평가가 높다. 자갈 토양의 밭에서 손수확하며 그해 수확량의 약 36%만 그랑 뱅에 담았다. 숙성은 신품 프렌치 오크 100%로 진행한다.",

  "_sources": ["https://..."],
  "_nameKoBasis": "신세계L&B 공식 제품 페이지 표기",
  "_confidence": "높음",
  "_uncertain": []
}
```

# 필드별 지침

## 기본 정보

| 필드 | 규칙 |
|---|---|
| `category` | 항상 `"WINE"`. 관리자 화면 붙여넣기가 이 값으로 카테고리를 정한다 |
| `nameKo` | 200자 이내. 위 "한국어 이름 규칙" 필수 적용 |
| `nameEn` | 라벨 표기 그대로, 200자 이내. 악센트 유지 (`Château`, `Rosé`) |
| `producer` | **양조장**(샤토/도멘/와이너리). 수입사가 아닙니다 |
| `abv` | 0~100. 소수 첫째 자리까지 (13.5) |
| `volumeMl` | 1~30000. 표준 750. 하프 375, 매그넘 1500 |

**주의:** 와인은 등록 폼에 `브랜드명`·`에디션`·`병입 연월`·`출시일`·`배치 번호`·`병 번호`·
`총 병 수`·`숙성 연수` 입력란이 **없습니다.** 빈티지가 그 역할을 합니다.
해당 정보를 알아냈으면 `notes`에 문장으로 적으세요.

## 산지

`country`는 한글 국가명, `region`은 한글 지역명을 씁니다.
`regionCode`는 아래 목록에 있으면 쓰고, **없으면 `null`로 두세요**(등록 화면에서 직접 고릅니다).
하위 산지가 명확하면 하위 코드를, 아니면 상위 코드를 쓰세요.

```
프랑스   FR_BORDEAUX  FR_BORDEAUX_MEDOC  FR_BORDEAUX_SAINT_EMILION  FR_BORDEAUX_POMEROL
         FR_BORDEAUX_GRAVES  FR_BORDEAUX_SAUTERNES  FR_BORDEAUX_ENTRE_DEUX_MERS
         FR_BOURGOGNE  FR_BOURGOGNE_CHABLIS  FR_BOURGOGNE_COTE_DE_NUITS
         FR_BOURGOGNE_COTE_DE_BEAUNE  FR_BOURGOGNE_COTE_CHALONNAISE  FR_BOURGOGNE_MACONNAIS
         FR_CHAMPAGNE  FR_ALSACE  FR_BEAUJOLAIS  FR_PROVENCE  FR_LANGUEDOC
         FR_LOIRE  FR_LOIRE_MUSCADET  FR_LOIRE_ANJOU  FR_LOIRE_VOUVRAY  FR_LOIRE_SANCERRE
         FR_RHONE  FR_RHONE_NORTHERN  FR_RHONE_SOUTHERN
         FR_SUD_OUEST  FR_JURA  FR_SAVOIE  FR_CORSE
이탈리아 IT_PIEMONTE  IT_PIEMONTE_BAROLO  IT_PIEMONTE_BARBARESCO  IT_PIEMONTE_ASTI
         IT_TOSCANA  IT_TOSCANA_CHIANTI_CLASSICO  IT_TOSCANA_MONTALCINO
         IT_TOSCANA_MONTEPULCIANO  IT_TOSCANA_BOLGHERI
         IT_VENETO  IT_VENETO_VALPOLICELLA  IT_VENETO_SOAVE  IT_VENETO_PROSECCO
         IT_LOMBARDIA  IT_TRENTINO_ALTO_ADIGE  IT_FRIULI  IT_EMILIA_ROMAGNA
         IT_MARCHE  IT_UMBRIA  IT_ABRUZZO  IT_CAMPANIA  IT_PUGLIA  IT_SICILIA  IT_SARDEGNA
스페인   ES_RIOJA  ES_RIOJA_ALTA  ES_RIOJA_ALAVESA  ES_RIOJA_ORIENTAL
         ES_CASTILLA_Y_LEON  ES_CASTILLA_Y_LEON_RIBERA_DEL_DUERO  ES_CASTILLA_Y_LEON_RUEDA
         ES_CASTILLA_Y_LEON_TORO  ES_CASTILLA_Y_LEON_BIERZO
         ES_CATALUNYA  ES_CATALUNYA_PRIORAT  ES_CATALUNYA_PENEDES  ES_CATALUNYA_MONTSANT
         ES_GALICIA  ES_GALICIA_RIAS_BAIXAS  ES_GALICIA_RIBEIRA_SACRA  ES_GALICIA_VALDEORRAS
         ES_ANDALUCIA  ES_ANDALUCIA_JEREZ  ES_ANDALUCIA_MONTILLA_MORILES
         ES_NAVARRA  ES_ARAGON  ES_VALENCIA  ES_CASTILLA_LA_MANCHA  ES_MURCIA  ES_MURCIA_JUMILLA
미국     US_CALIFORNIA  US_CALIFORNIA_NAPA_VALLEY  US_CALIFORNIA_SONOMA
         US_CALIFORNIA_MENDOCINO  US_CALIFORNIA_LODI  US_CALIFORNIA_PASO_ROBLES
         US_CALIFORNIA_SANTA_BARBARA
         US_OREGON  US_OREGON_WILLAMETTE_VALLEY
         US_WASHINGTON  US_WASHINGTON_COLUMBIA_VALLEY  US_WASHINGTON_WALLA_WALLA
         US_NEW_YORK  US_NEW_YORK_FINGER_LAKES  US_NEW_YORK_LONG_ISLAND
독일     DE_MOSEL  DE_RHEINGAU  DE_RHEINHESSEN  DE_PFALZ  DE_NAHE  DE_AHR  DE_MITTELRHEIN
         DE_BADEN  DE_WUERTTEMBERG  DE_FRANKEN  DE_SAALE_UNSTRUT  DE_SACHSEN
포르투갈 PT_DOURO  PT_VINHO_VERDE  PT_DAO  PT_BAIRRADA  PT_LISBOA  PT_ALENTEJO
         PT_SETUBAL  PT_MADEIRA  PT_ACORES
오스트리아 AT_NIEDEROSTERREICH  AT_NIEDEROSTERREICH_WACHAU  AT_NIEDEROSTERREICH_KAMPTAL
         AT_NIEDEROSTERREICH_KREMSTAL  AT_NIEDEROSTERREICH_WEINVIERTEL
         AT_BURGENLAND  AT_STEIERMARK  AT_WIEN
호주     AU_SOUTH_AUSTRALIA  AU_SOUTH_AUSTRALIA_BAROSSA_VALLEY  AU_SOUTH_AUSTRALIA_EDEN_VALLEY
         AU_SOUTH_AUSTRALIA_CLARE_VALLEY  AU_SOUTH_AUSTRALIA_MCLAREN_VALE
         AU_SOUTH_AUSTRALIA_ADELAIDE_HILLS  AU_SOUTH_AUSTRALIA_COONAWARRA
         AU_VICTORIA  AU_VICTORIA_YARRA_VALLEY  AU_VICTORIA_MORNINGTON_PENINSULA
         AU_VICTORIA_GEELONG  AU_VICTORIA_HEATHCOTE  AU_VICTORIA_RUTHERGLEN
         AU_NEW_SOUTH_WALES  AU_NEW_SOUTH_WALES_HUNTER_VALLEY  AU_NEW_SOUTH_WALES_MUDGEE
         AU_NEW_SOUTH_WALES_ORANGE  AU_NEW_SOUTH_WALES_CANBERRA_DISTRICT
         AU_WESTERN_AUSTRALIA  AU_WESTERN_AUSTRALIA_MARGARET_RIVER
         AU_WESTERN_AUSTRALIA_GREAT_SOUTHERN  AU_WESTERN_AUSTRALIA_SWAN_DISTRICT
         AU_TASMANIA  AU_TASMANIA_TAMAR_VALLEY  AU_TASMANIA_COAL_RIVER
뉴질랜드 NZ_MARLBOROUGH  NZ_HAWKES_BAY  NZ_OTAGO  NZ_OTAGO_CENTRAL_OTAGO  NZ_NELSON
         NZ_AUCKLAND  NZ_CANTERBURY  NZ_GISBORNE  NZ_WAIRARAPA
칠레     CL_COQUIMBO  CL_COQUIMBO_ELQUI  CL_COQUIMBO_LIMARI  CL_COQUIMBO_CHOAPA
         CL_ACONCAGUA  CL_ACONCAGUA_VALLEY  CL_ACONCAGUA_CASABLANCA  CL_ACONCAGUA_SAN_ANTONIO
         CL_CENTRAL_VALLEY  CL_CENTRAL_VALLEY_MAIPO  CL_CENTRAL_VALLEY_CACHAPOAL
         CL_CENTRAL_VALLEY_COLCHAGUA  CL_CENTRAL_VALLEY_CURICO  CL_CENTRAL_VALLEY_MAULE
         CL_SOUTHERN  CL_SOUTHERN_ITATA  CL_SOUTHERN_BIO_BIO  CL_SOUTHERN_MALLECO
아르헨티나 AR_MENDOZA  AR_MENDOZA_LUJAN_DE_CUYO  AR_MENDOZA_MAIPU  AR_MENDOZA_VALLE_DE_UCO
         AR_MENDOZA_SAN_RAFAEL  AR_SALTA  AR_SAN_JUAN  AR_RIO_NEGRO  AR_LA_RIOJA
         AR_NEUQUEN  AR_CATAMARCA
```
(남아공·조지아·헝가리·그리스·이스라엘·레바논·캐나다·우루과이·일본·중국 등도 코드가 있지만
목록이 길어 생략했습니다. 모르면 `null` + `region`에 한글 지역명.)

## 와인 종류

### `wineType` — **필수**. 다음 7개 중 하나.
```
RED        레드
WHITE      화이트
ROSE       로제
SPARKLING  스파클링 — 샴페인·까바·프로세코 등 모든 발포성 와인.
           샴페인은 SPARKLING을 고르고 regionCode를 FR_CHAMPAGNE로 지정
DESSERT    디저트 — 소테른, 아이스바인, TBA 등
ORANGE     오렌지 — 청포도를 껍질째 발효한 와인
FORTIFIED  주정강화 — 포트·셰리·마데이라·마르살라
```

## 빈티지

| 필드 | 규칙 |
|---|---|
| `vintageStatus` | `VINTAGE` 또는 `NON_VINTAGE`. 모르면 `UNKNOWN` |
| `vintageYear` | `vintageStatus`가 `VINTAGE`일 때 **필수**. 1800~현재 |

`NON_VINTAGE`(NV 샴페인 등)이면 `vintageYear`는 반드시 `null`.

## 포도 품종

`grapeVarieties` 배열. **품종명은 영문으로 씁니다** (한글 화면·영문 화면이 같은 값을 공유합니다).

```json
[{ "name": "Cabernet Sauvignon", "percentage": 90 }]
```
- `name` 100자 이내, `percentage` 1~100
- 비율 합계는 **100을 넘을 수 없습니다**
- 비율이 공개되지 않았으면 품종만 나열하고 `percentage`는 전부 `null`
- 블렌드 비율은 빈티지마다 달라집니다. 조사한 빈티지의 값인지 확인하세요
- 정보가 없으면 빈 배열 `[]`

## 재배·양조

| 필드 | 규칙 |
|---|---|
| `appellationDesignation` | 원산지 명칭. 200자 이내. 예: `AOC Margaux`, `DOCG Barolo`, `Napa Valley AVA` |
| `soilType` | 토양. 100자 이내. 영문 표기 권장. 예: `Limestone`, `Gravel`, `Clay-Limestone` |
| `altitudeM` | 포도밭 고도(m). 0~5000 |
| `harvestMethod` | **`Hand-picked` 또는 `Machine-harvested`만.** 그 외는 `null` |
| `fermentationVessel` | **`Stainless Steel` / `Concrete` / `Oak Vat` / `Amphora` 중 하나만.** 그 외는 `null` |

## 오크 숙성

| 필드 | 규칙 |
|---|---|
| `isOakAged` | `true` / `false` / `null`(미상) |
| `oakType` | `isOakAged`가 `true`일 때만. 100자 이내. `French Oak` / `American Oak` / `Hungarian Oak`가 흔하지만 자유 입력이라 `Slavonian Oak` 등도 가능 |
| `oakAgedMonths` | `isOakAged`가 `true`일 때만. 1~600(개월) |

`isOakAged`가 `true`가 아니면 `oakType`·`oakAgedMonths`는 반드시 `null`.

## 내추럴·인증

| 필드 | 규칙 |
|---|---|
| `isNaturalWine` | 내추럴 와인을 **표방**하면 `true`. 통일된 법적 인증이 아니라 생산자 표방 여부입니다 |
| `certification` | `ORGANIC` / `BIODYNAMIC` / `SUSTAINABLE` / `NONE` 중 하나. 인증이 없다고 **확인된** 경우만 `NONE`, 모르면 `null` |

## 관능(맛) 지표 — 5단계

라벨·공식 테이스팅 노트·전문 매체 평가에 근거가 있을 때만 채우세요. **감으로 채우지 마세요.**
모르는 축은 `null`로 두면 화면에서 "정보 없음"으로 표시됩니다.

```
sweetness  DRY → OFF_DRY → MEDIUM → MEDIUM_SWEET → SWEET
body       LIGHT → LIGHT_MEDIUM → MEDIUM → MEDIUM_FULL → FULL
acidity    LOW → LOW_MEDIUM → MEDIUM → MEDIUM_HIGH → HIGH
tannin     LOW → LOW_MEDIUM → MEDIUM → MEDIUM_HIGH → HIGH
```

- 화이트·로제·스파클링은 `tannin`이 보통 `LOW`이거나 해당 없음(`null`)입니다
- `DESSERT`는 `sweetness`가 `SWEET`, `FORTIFIED`는 제품에 따라 `DRY`(피노 셰리)~`SWEET`(PX)로 갈립니다
- 영문 자료의 표현을 위 5단계로 옮길 때:
  `crisp/high acidity` → `HIGH`, `medium(+)` → `MEDIUM_HIGH`, `medium(−)` → `LOW_MEDIUM`,
  `full-bodied` → `FULL`, `medium to full` → `MEDIUM_FULL`

## `notes` — 이 제품의 특징(스펙) 요약 **400자 이내**

폼의 "기타 정보" 칸에 들어갑니다. 사실 나열이 아니라 **이 와인이 어떤 술인지 읽고 파악되는 문단**으로
400자 이내(공백 포함)로 쓰세요. 아래를 확인된 것만 골라 자연스러운 문장으로 엮습니다.

1. **정체성·등급** — 그랑 크뤼 클라세 / DOCG / 1급 등 분류상 위치, 생산자의 대표작인지
2. **빈티지 특성** — 그해 작황과 평가. 빈티지마다 다르므로 조사한 연도의 것인지 확인
3. **포도밭** — 수령, 수확량 제한, 밭 방향·경사, 토양이 맛에 주는 성격
4. **양조** — 발효 온도·기간, 침용, 말로락틱, 여과·정제 여부, 이산화황
5. **숙성** — 신품 오크 비율, 숙성·병숙성 기간
   (※ `oakType`·`oakAgedMonths`에 이미 있으니 여기서는 **비율처럼 폼에 칸이 없는 것** 위주로)
6. **맛 프로필** — 공식 테이스팅 노트 기준의 향·맛·피니시, 음용 적기
7. **배경** — 생산량, 평론 점수, 수상 이력. **폼에 칸이 없는 병입일·출시일·총 병 수도 여기에**

- **모르는 항목은 넣지 마세요.** 7개를 다 채우려고 억지로 늘리지 말 것
- 마케팅 문구를 그대로 옮기지 말고("전설적인", "최고의") 사실 위주로
- 다른 필드에 이미 들어간 값(와인 종류·빈티지·품종·도수·관능 4축)은 반복하지 마세요
- **400자를 넘으면 잘라내지 말고 덜 중요한 항목부터 빼서 다시 쓰세요**

예시(283자):
> 보르도 1855년 등급의 1등급(프리미에 크뤼) 다섯 곳 중 하나이며, 마고 아펠라시옹을 대표하는
> 샤토의 그랑 뱅이다. 2018년은 좌안에서 개화기 강우와 여름 가뭄을 거쳐 폴리페놀이 두텁게 쌓인
> 해로, 여러 평론가가 근래 최고 수준으로 평가했다. 자갈 토양의 밭에서 손수확하며, 그해 수확량의
> 약 36%만 그랑 뱅에 담았다. 발효는 오크 통에서, 숙성은 신품 프렌치 오크 100%로 24개월간
> 진행한다. 공식 노트는 제비꽃과 검은 과실, 미세하고 촘촘한 타닌을 들며 음용 적기를 2030년대
> 이후로 본다.

# 마지막 확인

JSON을 내놓기 전에 스스로 점검하세요.

- [ ] `nameKo`가 원어 발음 음차가 아니라 **국내 통용 표기**인가. `_nameKoBasis`에 근거를 적었는가
- [ ] `wineType`이 채워져 있는가 (없으면 등록이 막힙니다)
- [ ] `vintageStatus`가 `VINTAGE`면 `vintageYear`가 있는가. `NON_VINTAGE`면 `vintageYear`가 `null`인가
- [ ] 모든 enum 값(`wineType`·`vintageStatus`·`certification`·관능 4축·`regionCode`)이
      위 목록에 있는 철자 그대로인가
- [ ] `harvestMethod`·`fermentationVessel`이 정해진 선택지 그대로인가 (자유 문구 금지)
- [ ] 포도 품종명이 **영문**이고 비율 합계가 100 이하인가
- [ ] `isOakAged`가 `true`가 아닌데 `oakType`/`oakAgedMonths`를 채우지 않았는가
- [ ] 관능 지표를 근거 없이 감으로 채우지 않았는가
- [ ] 지어낸 숫자가 하나도 없는가 — 모르면 `null`
- [ ] `notes`가 **400자 이내**이고, 사실 나열이 아니라 제품을 파악할 수 있는 문단인가
- [ ] 글자 수 제한(`appellationDesignation` 200, `soilType`·`oakType` 각 100)을 지켰는가
- [ ] `_sources`에 실제 접근 가능한 URL이 있는가

## 조사 대상

<!-- 여기에 제품명을 적으세요. 빈티지를 함께 적으면 정확도가 올라갑니다. 예:
- Château Margaux 2018
- Penfolds Grange 2017
- Cloudy Bay Sauvignon Blanc 2023
- Veuve Clicquot Yellow Label NV
-->
````

---

## 사용 팁

- **빈티지를 반드시 함께 지정할 것.** 같은 와인이라도 빈티지마다 도수·블렌드 비율·관능이 다르다.
  빈티지 없이 시키면 AI가 여러 빈티지 정보를 섞어 온다.
- **블렌드 비율**은 AI가 가장 자주 지어내는 항목이다. 보르도 그랑 크뤼처럼 매년 비율을 공식 발표하는
  곳이 아니면 `percentage`가 전부 채워져 온 것은 의심할 것.
- **관능 지표 4축**도 근거 없이 채우기 쉽다. `DRY`/`FULL` 같은 극단값은 대체로 맞지만
  `MEDIUM_HIGH` 같은 중간 단계를 자신 있게 써 오면 출처를 확인할 것.
- `harvestMethod`·`fermentationVessel`은 드롭다운이라 정해진 문자열이 아니면 입력되지 않는다.
  AI가 `Hand harvested`처럼 비슷하지만 다른 문자열을 쓰면 그대로 쓰지 말고 고칠 것.
- 와인은 **한 번에 3~5개**씩 끊어서 시킬 것.
