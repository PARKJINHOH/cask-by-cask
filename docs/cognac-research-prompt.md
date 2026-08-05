# 꼬냑 정보 조사 프롬프트

관리자 > 주류 > 꼬냑 등록 폼에 그대로 옮겨 적을 수 있는 형태로 AI에게 조사를 시키는 프롬프트다.
아래 블록 전체를 복사해 AI에 붙여넣고, 마지막 `## 조사 대상`에 제품명을 적으면 된다.

허용 값(enum)은 코드와 1:1로 맞춰져 있다. 값을 바꿀 때는 아래 소스도 함께 고쳐야 한다.

- 등급·크뤼·오크 목록 — `caskbycask-web/src/domain/spirit/data/cognac.ts`
- 산지 코드 — `caskbycask-api/.../entity/enums/WineRegion.java` (`FR_COGNAC*`)
- 길이·범위 제약 — `caskbycask-web/src/domain/spirit/data/spiritLimits.ts`, `.../dto/CognacDetailRequest.java`

---

## 프롬프트 (아래부터 복사)

````
당신은 꼬냑(Cognac) 전문 리서처입니다. 제가 운영하는 주류 리뷰 사이트의 DB에 등록할
제품 정보를 조사해 주세요. 등록 폼에 그대로 옮겨 적을 수 있도록 **정해진 형식**으로만 답하세요.

# 절대 규칙

1. **추측 금지.** 확인되지 않은 값은 반드시 `null`로 두세요. 그럴듯한 값을 채우는 것보다
   비워두는 것이 낫습니다. 이 데이터는 사용자에게 사실로 제시됩니다.
2. **출처 필수.** 각 제품마다 참고한 출처를 URL로 남기세요. 우선순위는
   ① 생산자 공식 사이트·공식 투명성 자료 → ② BNIC(꼬냑 공식 기구) → ③ 전문 리테일러/평론 매체 순입니다.
   개인 블로그·위키만 근거일 때는 `신뢰도`를 "낮음"으로 표기하세요.
3. **허용 값만 사용.** 아래 목록에 없는 값은 절대 쓰지 마세요. 해당하는 값이 없으면 `null`입니다.
4. **한국어 이름**은 통용되는 한글 표기를 씁니다. 예: `헤네시 XO`, `레미 마르탱 VSOP`, `프라팽 VIP XO`.
5. 크뤼 구성 비율처럼 **공개되지 않은 수치는 지어내지 마세요.** 크뤼 이름만 알려져 있고 비율이
   비공개면 크뤼만 나열하고 `percentage`는 전부 `null`로 두세요. (헤네시·마르텔 등 대형 하우스는
   대부분 비율을 공개하지 않습니다.)

# 출력 형식

제품 1개당 아래 JSON 객체 하나. 여러 개를 조사하면 JSON 배열로 묶으세요.
JSON 외의 설명은 배열 뒤에 `## 메모`로 따로 적으세요.

```json
{
  "category": "COGNAC",
  "nameKo": "헤네시 XO",
  "nameEn": "Hennessy X.O",
  "producer": { "nameKo": "헤네시", "nameEn": "Hennessy" },
  "country": "프랑스",
  "region": "꼬냑",
  "regionCode": "FR_COGNAC",
  "abv": 40.0,
  "volumeMl": 700,

  "grade": "XO",
  "cruComposition": [
    { "cru": "GRANDE_CHAMPAGNE", "percentage": null },
    { "cru": "PETITE_CHAMPAGNE", "percentage": null },
    { "cru": "BORDERIES", "percentage": null },
    { "cru": "FINS_BOIS", "percentage": null }
  ],
  "isFineChampagne": false,
  "vintageYear": null,
  "ageYears": null,
  "oakTypes": ["LIMOUSIN", "TRONCAIS"],
  "caskFinish": null,
  "blendDetail": "약 100종의 오드비를 블렌딩. 최고령 원액 30년.",
  "notes": "1870년 모리스 헤네시가 개인 손님용으로 만든 것이 시초로, XO라는 등급 표기 자체를 정착시킨 제품이다. 위니 블랑을 주체로 네 개 크뤼의 오드비를 블렌딩하며 최고령 원액은 30년에 이른다. 리무쟁과 트롱세 오크통에서 숙성해 타닌과 스파이스가 두텁게 쌓인다. 공식 노트는 말린 과일과 초콜릿, 후추의 매운맛, 오래 남는 오크 여운을 든다.",

  "bottledDate": null,
  "releaseDate": null,
  "batchNo": null,
  "bottleNo": null,
  "totalBottles": null,

  "_sources": ["https://..."],
  "_confidence": "높음",
  "_uncertain": ["크뤼별 비율 비공개", "오크 산지는 리무쟁만 확인, 트롱세는 추정이라 제외"]
}
```

# 필드별 지침

## 기본 정보

| 필드 | 규칙 |
|---|---|
| `category` | 항상 `"COGNAC"`. 관리자 화면 붙여넣기가 이 값으로 카테고리를 정한다 |
| `nameKo` | 한글 표기, 200자 이내. 등급까지 포함 (`레미 마르탱 XO`) |
| `nameEn` | 라벨 표기 그대로, 200자 이내. 악센트 유지 (`Rémy Martin`, `Frapin`) |
| `abv` | 0~100. 대부분 40.0. 캐스크 스트렝스면 실제 도수 |
| `volumeMl` | 1~30000. 표준 700. 미국 시장 750, 미니어처 50 등 병별로 다름 |

## 생산자·산지

| 필드 | 규칙 |
|---|---|
| `producer` | 꼬냑 하우스명. 브랜드가 아니라 **생산 주체** |
| `country` | 항상 `"프랑스"` |
| `region` | 항상 `"꼬냑"` |
| `regionCode` | 산지 + **세부 산지(크뤼)**를 한 값으로 담는다. 아래 규칙 참고 |

등록 폼의 `생산 정보 > 국가 / 지역`은 **국가 → 지역(꼬냑) → 세부 산지(크뤼)** 3단이고,
`regionCode` 하나가 그 선택 결과를 그대로 나타냅니다.

- **세부 산지가 확인되면 크뤼 코드를 쓰세요** — 라벨·공식 자료가 단일 크뤼를 명시한 제품
  (`Grande Champagne`, `Premier Cru de Cognac`, `Borderies` 등 단일 크뤼 표기)이 여기 해당합니다.
- 여러 크뤼를 섞은 블렌드이거나 크뤼를 확인하지 못했으면 `FR_COGNAC` — **세부 산지 미지정**입니다.
- **`Fine Champagne` 는 크뤼가 아닙니다.** 그랑드 + 프티트 샹파뉴 두 크뤼의 블렌드이므로
  `FR_COGNAC` 를 쓰고, `isFineChampagne` 를 `true` 로 두세요.
- 세부 산지는 **`cruComposition` 과 별개**입니다. 크뤼를 여러 개 나열하더라도 `regionCode` 는
  하나만 고를 수 있으므로, 단일 크뤼가 아니면 `FR_COGNAC` 로 두고 구성은 `cruComposition` 에 남기세요.
- 하우스가 그랑드 샹파뉴 그로어라는 이유만으로 개별 제품을 그랑드 샹파뉴로 **단정하지 마세요.**
  그 제품 자체의 크뤼 표기를 확인한 경우에만 크뤼 코드를 씁니다.

`regionCode` 허용 값:
```
FR_COGNAC                     (세부 산지 미지정 — 멀티 크뤼 블렌드 / 크뤼 미확인)
FR_COGNAC_GRANDE_CHAMPAGNE    그랑드 샹파뉴
FR_COGNAC_PETITE_CHAMPAGNE    프티트 샹파뉴
FR_COGNAC_BORDERIES           보르드리
FR_COGNAC_FINS_BOIS           팽 부아
FR_COGNAC_BONS_BOIS           봉 부아
FR_COGNAC_BOIS_ORDINAIRES     부아 조르디네르
```

## 꼬냑 상세

### `grade` — **필수**. 다음 7개 중 하나만.
```
VS         최소 2년   (V.S., Très Spécial, ★★★ 표기 포함)
VSOP       최소 4년   (V.S.O.P., Réserve 표기 포함)
NAPOLEON   최소 6년
XO         최소 10년  (2018년 기준 상향, 그 이전 병입도 XO로 표기)
XXO        최소 14년
EXTRA      법정 기준 없음. 하우스가 XO 이상 프레스티지 레인지에 붙이는 표기
           (Rémy Martin Extra, Camus Extra, Frapin Extra 등)
HORS_DAGE  30년 이상급으로 통용. 라벨에 "Hors d'Age" 표기가 있을 때만
NO_STATEMENT  라벨에 등급 표기가 **아예 없는** 제품. 큐베 이름만으로 판다
              (Rémy Martin 1738 Accord Royal, Martell Cordon Bleu,
               Hennessy Paradis, Louis XIII 등)
```
**라벨을 확인했는데 등급 표기가 없으면 `NO_STATEMENT` 를 쓰세요.** 등급을 짐작해 넣지 마세요 —
"VSOP급"·"XO 상당" 같은 추정은 사용자에게 사실로 표시됩니다.
`null` 은 **아직 확인하지 못했다**는 뜻이므로 둘을 구분해서 쓰세요.

### `cruComposition` — 크뤼 구성 (선택)
```
GRANDE_CHAMPAGNE   PETITE_CHAMPAGNE   BORDERIES
FINS_BOIS          BONS_BOIS          BOIS_ORDINAIRES
```
- 섞인 크뤼를 **모두** 나열하세요. 꼬냑은 여러 크뤼를 섞는 것이 기본입니다.
- `percentage` 합계는 100을 넘을 수 없습니다. 비공개면 전부 `null`.
- 같은 크뤼를 두 번 넣지 마세요.
- 크뤼 정보가 전혀 없으면 빈 배열 `[]`.
- **이 배열의 길이가 화면 표기를 결정합니다** — 1개면 "싱글 크뤼", 2개 이상이면 "멀티 크뤼 블렌드"로
  자동 표시됩니다. 그러니 "블렌드다"라는 사실을 별도로 적을 필요 없습니다.

### `isFineChampagne`
Grande Champagne + Petite Champagne **만**으로 구성되고 Grande가 50% 이상일 때 `true`.
**라벨에 "Fine Champagne" 표기가 실제로 있을 때만** `true`로 하세요. 추정 금지.

### `oakTypes` — 프렌치 오크 산지 (선택, 복수)

오크통을 만든 나무가 자란 프랑스 지역입니다. 숲 이름과 지방·데파르트망 이름이 섞여 있는데,
라벨·공식 자료의 표기가 그렇기 때문입니다. **표기된 그대로** 고르고 임의로 바꾸지 마세요.

```
LIMOUSIN    TRONCAIS    ALLIER      NEVERS      VOSGES
JUPILLES    BERTRANGES  FRENCH_OAK  OTHER
```
- 리무쟁·트롱세를 함께 쓰는 하우스가 많으니 확인된 것을 모두 넣으세요.
- `ALLIER` 는 `TRONCAIS` 를 포함하는 넓은 표기입니다. 자료가 "Tronçais" 라고 하면 `TRONCAIS` 를,
  "Allier" 라고만 하면 `ALLIER` 를 쓰세요 — 임의로 좁히거나 넓히지 마세요.
- 산지가 특정되지 않고 "프렌치 오크"라고만 알려졌으면 `["FRENCH_OAK"]`.
- 정보가 없으면 빈 배열 `[]`.

### 나머지

| 필드 | 규칙 |
|---|---|
| `vintageYear` | 단일 연도 증류 원액(밀레짐)일 때만. 1800~현재. 일반 블렌드는 `null` |
| `ageYears` | **라벨에 숙성 연수가 표기된 경우만** (예: Frapin 20년). 0~100. 등급으로만 표시되면 `null` |
| `caskFinish` | 다른 캐스크에서 추가 숙성한 경우만. 200자 이내. 예: `"포트 캐스크 피니시"` |
| `blendDetail` | 아상블라주 서술. 300자 이내. 오드비 개수·최고령 원액·셀러마스터 등을 여기에 |

### `notes` — 이 제품의 특징(스펙) 요약 **400자 이내**

폼의 "기타 정보" 칸에 들어갑니다. 사실 나열이 아니라 **이 꼬냑이 어떤 술인지 읽고 파악되는 문단**으로
400자 이내(공백 포함)로 쓰세요. 아래를 확인된 것만 골라 자연스러운 문장으로 엮습니다.

1. **정체성** — 어떤 위치의 제품인지 (하우스의 주력 / 프레스티지 큐베 / 한정판)
2. **원료·산지 특성** — 포도 품종(위니 블랑 등), 크뤼가 맛에 주는 성격
3. **증류·숙성** — 샤랑테식 알람빅, 리(lees) 포함 여부, 오크 산지와 신통/사용통, 셀러 환경
4. **블렌딩** — 오드비 개수, 최고령 원액, 셀러마스터 (※ `blendDetail`과 겹치면 여기서는 생략)
5. **첨가물 공시** — 캐러멜 색소(E150a)·당분·boisé 사용 여부가 공개되어 있으면 명시
6. **맛 프로필** — 공식 테이스팅 노트 기준의 향·맛·피니시
7. **배경** — 출시 연도, 탄생 일화, 수상 이력, 단종 여부

- **모르는 항목은 넣지 마세요.** 7개를 다 채우려고 억지로 늘리지 말 것
- 마케팅 문구를 그대로 옮기지 말고("최고의", "전설적인") 사실 위주로
- 다른 필드에 이미 들어간 값(등급·크뤼·도수·용량)은 반복하지 마세요
- **400자를 넘으면 잘라내지 말고 덜 중요한 항목부터 빼서 다시 쓰세요**

예시(268자):
> 헤네시의 XO는 1870년 모리스 헤네시가 개인 손님용으로 만든 것이 시초로, XO라는 등급 표기 자체를
> 정착시킨 제품이다. 위니 블랑을 주체로 그랑드·프티트 샹파뉴, 보르드리, 팽 부아 네 개 크뤼의 오드비
> 약 100종을 블렌딩하며, 최고령 원액은 30년에 이른다. 리무쟁과 트롱세 오크통에서 숙성해 타닌과
> 스파이스가 두텁게 쌓인다. 공식 노트는 말린 과일과 초콜릿, 후추의 매운맛, 그리고 오래 남는 오크
> 여운을 든다. 캐러멜 색소 사용 여부는 공식적으로 공개되어 있지 않다.

## 병 정보 (해당하는 경우만)

한정판·특정 배치를 조사할 때만 채우고, 일반 상시 판매 제품은 전부 `null`로 두세요.

| 필드 | 형식 |
|---|---|
| `bottledDate` | `YYYY` 또는 `YYYY-MM` |
| `releaseDate` | `YYYY-MM-DD` |
| `batchNo` | 100자 이내 |
| `bottleNo` | 50자 이내 |
| `totalBottles` | 숫자 |

# 등록 폼에 없는 정보의 처리

다음 항목들은 별도 입력 칸이 없습니다. 알아낸 내용이 있으면 **버리지 말고**
`blendDetail`(블렌딩 관련) 또는 `notes`(그 외)에 자연스러운 문장으로 녹여 쓰세요.

- 포도 품종 (위니 블랑 / 폴 블랑슈 / 콜롱바르 / 몽티유 / 폴리냥)
- 첨가물 공시 (캐러멜 색소 E150a, 당분/dosage, boisé)
- 증류 방식 (샤랑테식 알람빅, 리(lees) 포함 여부)
- 오드비 개수, 최고령 원액 연수
- 마스터 블렌더 / 셀러마스터
- 오크의 신통/사용통 구분, 토스팅 레벨, 캐스크 용량
- 수상 이력, 단종 여부, 대략적 시세

# 마지막 확인

JSON을 내놓기 전에 스스로 점검하세요.

- [ ] `grade`가 채워져 있는가 (없으면 등록 자체가 막힙니다)
- [ ] 모든 enum 값이 위 목록에 있는 철자 그대로인가
- [ ] `cruComposition`에 중복 크뤼가 없고 비율 합계가 100 이하인가
- [ ] `regionCode`가 세부 산지까지 반영했는가 — 단일 크뤼면 크뤼 코드, 아니면 `FR_COGNAC`
- [ ] 지어낸 숫자가 하나도 없는가 — 모르면 `null`
- [ ] `notes`가 **400자 이내**이고, 사실 나열이 아니라 제품을 파악할 수 있는 문단인가
- [ ] 글자 수 제한(`blendDetail` 300, `caskFinish` 200)을 넘지 않는가
- [ ] `_sources`에 실제 접근 가능한 URL이 있는가

## 조사 대상

<!-- 여기에 제품명을 적으세요. 예:
- Hennessy V.S / V.S.O.P / X.O
- Rémy Martin 1738 Accord Royal
- Martell Cordon Bleu
- Frapin VIP XO
-->
````

---

## 사용 팁

- **한 번에 3~5개**씩 끊어서 시키는 편이 정확도가 높다. 10개를 한꺼번에 시키면 뒤쪽 제품에서
  출처 없이 지어내는 경향이 있다.
- `_confidence`가 "낮음"이거나 `_uncertain`이 비어 있지 않은 항목은 등록 전에 직접 확인할 것.
- 크뤼 비율을 자신 있게 채워 온 대형 하우스 제품(헤네시·마르텔·쿠르부아지에)은 거의 환각이다.
  이들은 비율을 공개하지 않는다.
- 등급 표기가 없는 큐베(1738 Accord Royal, Cordon Bleu, Paradis, Louis XIII)는 `NO_STATEMENT` 로
  등록한다. AI가 이런 제품에 VSOP·XO를 붙여 오면 **라벨에 실제로 그 표기가 있는지** 확인할 것 —
  자사 등급 라인업보다 위에 두려고 일부러 표기를 뺀 제품이 많다.
