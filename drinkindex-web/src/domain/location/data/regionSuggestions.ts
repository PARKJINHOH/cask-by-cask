export interface RegionSuggestion {
  nameKo: string
  nameEn: string
}

/**
 * ISO 3166-1 alpha-2 코드 → 술 도메인 기준 큐레이션 지역 목록
 * 위스키 / 꼬냑 / 와인 / 럼 등 주요 생산지 중심으로 구성
 */
export const REGION_SUGGESTIONS: Record<string, RegionSuggestion[]> = {
  // ── 영국 전체 등록 시 — 구성국 목록 ────────────────────────
  GB: [
    { nameKo: '스코틀랜드', nameEn: 'Scotland' },
    { nameKo: '잉글랜드', nameEn: 'England' },
    { nameKo: '웨일스', nameEn: 'Wales' },
    { nameKo: '북아일랜드', nameEn: 'Northern Ireland' },
  ],

  // ── 스코틀랜드 (스카치 위스키 5대 생산지) ────────────────
  'GB-SCT': [
    { nameKo: '스페이사이드', nameEn: 'Speyside' },
    { nameKo: '하이랜드', nameEn: 'Highlands' },
    { nameKo: '아일라', nameEn: 'Islay' },
    { nameKo: '로우랜드', nameEn: 'Lowlands' },
    { nameKo: '캠벨타운', nameEn: 'Campbeltown' },
    { nameKo: '아일랜드 (섬)', nameEn: 'Islands' },
  ],

  // ── 잉글랜드 (영국 위스키 / 진) ─────────────────────────
  'GB-ENG': [
    { nameKo: '요크셔', nameEn: 'Yorkshire' },
    { nameKo: '런던', nameEn: 'London' },
    { nameKo: '노퍽', nameEn: 'Norfolk' },
    { nameKo: '콘월', nameEn: 'Cornwall' },
    { nameKo: '레이크 디스트릭트', nameEn: 'Lake District' },
    { nameKo: '켄트', nameEn: 'Kent' },
  ],

  // ── 웨일스 ────────────────────────────────────────────────
  'GB-WLS': [
    { nameKo: '펨브로크셔', nameEn: 'Pembrokeshire' },
    { nameKo: '카디프', nameEn: 'Cardiff' },
    { nameKo: '스노도니아', nameEn: 'Snowdonia' },
  ],

  // ── 북아일랜드 (아이리시 위스키) ─────────────────────────
  'GB-NIR': [
    { nameKo: '앤트림', nameEn: 'Antrim' },
    { nameKo: '부쉬밀스', nameEn: 'Bushmills' },
    { nameKo: '카운티다운', nameEn: 'County Down' },
    { nameKo: '런던데리', nameEn: 'Londonderry' },
  ],

  // ── 아일랜드 (위스키) ─────────────────────────────────────
  IE: [
    { nameKo: '더블린', nameEn: 'Dublin' },
    { nameKo: '코크', nameEn: 'Cork' },
    { nameKo: '미들턴', nameEn: 'Midleton' },
    { nameKo: '킬베간', nameEn: 'Kilbeggan' },
    { nameKo: '부쉬밀스', nameEn: 'Bushmills' },
    { nameKo: '코네마라', nameEn: 'Connemara' },
    { nameKo: '티퍼레리', nameEn: 'Tipperary' },
  ],

  // ── 프랑스 (꼬냑 / 아르마냑 / 와인) ──────────────────────
  FR: [
    { nameKo: '꼬냑', nameEn: 'Cognac' },
    { nameKo: '아르마냑', nameEn: 'Armagnac' },
    { nameKo: '칼바도스', nameEn: 'Calvados' },
    { nameKo: '샴페인', nameEn: 'Champagne' },
    { nameKo: '부르고뉴', nameEn: 'Burgundy' },
    { nameKo: '보르도', nameEn: 'Bordeaux' },
    { nameKo: '알자스', nameEn: 'Alsace' },
    { nameKo: '루아르', nameEn: 'Loire Valley' },
    { nameKo: '론', nameEn: 'Rhône Valley' },
    { nameKo: '랑그도크루시옹', nameEn: 'Languedoc-Roussillon' },
    { nameKo: '프로방스', nameEn: 'Provence' },
    { nameKo: '쥐라', nameEn: 'Jura' },
    { nameKo: '사부아', nameEn: 'Savoie' },
  ],

  // ── 미국 (버번 / 라이 / 와인) ────────────────────────────
  US: [
    { nameKo: '켄터키', nameEn: 'Kentucky' },
    { nameKo: '테네시', nameEn: 'Tennessee' },
    { nameKo: '텍사스', nameEn: 'Texas' },
    { nameKo: '캘리포니아', nameEn: 'California' },
    { nameKo: '뉴욕', nameEn: 'New York' },
    { nameKo: '오리건', nameEn: 'Oregon' },
    { nameKo: '워싱턴', nameEn: 'Washington' },
    { nameKo: '버지니아', nameEn: 'Virginia' },
    { nameKo: '콜로라도', nameEn: 'Colorado' },
    { nameKo: '펜실베이니아', nameEn: 'Pennsylvania' },
    { nameKo: '인디애나', nameEn: 'Indiana' },
  ],

  // ── 일본 (위스키) ─────────────────────────────────────────
  JP: [
    { nameKo: '홋카이도', nameEn: 'Hokkaido' },
    { nameKo: '미야기', nameEn: 'Miyagi' },
    { nameKo: '야마나시', nameEn: 'Yamanashi' },
    { nameKo: '시즈오카', nameEn: 'Shizuoka' },
    { nameKo: '이와테', nameEn: 'Iwate' },
    { nameKo: '오이타', nameEn: 'Oita' },
    { nameKo: '와카야마', nameEn: 'Wakayama' },
    { nameKo: '오사카', nameEn: 'Osaka' },
  ],

  // ── 이탈리아 (와인) ───────────────────────────────────────
  IT: [
    { nameKo: '피에몬테', nameEn: 'Piedmont' },
    { nameKo: '토스카나', nameEn: 'Tuscany' },
    { nameKo: '베네토', nameEn: 'Veneto' },
    { nameKo: '시칠리아', nameEn: 'Sicily' },
    { nameKo: '사르데냐', nameEn: 'Sardinia' },
    { nameKo: '롬바르디아', nameEn: 'Lombardy' },
    { nameKo: '움브리아', nameEn: 'Umbria' },
    { nameKo: '칼라브리아', nameEn: 'Calabria' },
    { nameKo: '에밀리아로마냐', nameEn: 'Emilia-Romagna' },
    { nameKo: '트렌티노알토아디제', nameEn: 'Trentino-Alto Adige' },
  ],

  // ── 스페인 (와인 / 브랜디) ───────────────────────────────
  ES: [
    { nameKo: '리오하', nameEn: 'Rioja' },
    { nameKo: '리베라 델 두에로', nameEn: 'Ribera del Duero' },
    { nameKo: '프리오라트', nameEn: 'Priorat' },
    { nameKo: '갈리시아', nameEn: 'Galicia' },
    { nameKo: '안달루시아', nameEn: 'Andalusia' },
    { nameKo: '카탈루냐', nameEn: 'Catalonia' },
    { nameKo: '바스크', nameEn: 'Basque Country' },
    { nameKo: '아라곤', nameEn: 'Aragon' },
    { nameKo: '카스티야이레온', nameEn: 'Castilla y León' },
    { nameKo: '발렌시아', nameEn: 'Valencia' },
  ],

  // ── 포르투갈 (포트 / 와인) ───────────────────────────────
  PT: [
    { nameKo: '도루', nameEn: 'Douro' },
    { nameKo: '알렌테주', nameEn: 'Alentejo' },
    { nameKo: '비뉴베르드', nameEn: 'Vinho Verde' },
    { nameKo: '다웅', nameEn: 'Dão' },
    { nameKo: '바이라다', nameEn: 'Bairrada' },
    { nameKo: '리스본', nameEn: 'Lisboa' },
    { nameKo: '마데이라', nameEn: 'Madeira' },
    { nameKo: '아조레스', nameEn: 'Azores' },
    { nameKo: '세투발', nameEn: 'Setúbal' },
  ],

  // ── 독일 (라인와인 / 위스키) ────────────────────────────
  DE: [
    { nameKo: '라인가우', nameEn: 'Rheingau' },
    { nameKo: '모젤', nameEn: 'Mosel' },
    { nameKo: '팔츠', nameEn: 'Pfalz' },
    { nameKo: '바덴', nameEn: 'Baden' },
    { nameKo: '라인헤센', nameEn: 'Rheinhessen' },
    { nameKo: '프랑켄', nameEn: 'Franken' },
    { nameKo: '나헤', nameEn: 'Nahe' },
    { nameKo: '바이에른', nameEn: 'Bavaria' },
  ],

  // ── 멕시코 (테킬라 / 메스칼) ────────────────────────────
  MX: [
    { nameKo: '할리스코', nameEn: 'Jalisco' },
    { nameKo: '오악사카', nameEn: 'Oaxaca' },
    { nameKo: '게레로', nameEn: 'Guerrero' },
    { nameKo: '타마울리파스', nameEn: 'Tamaulipas' },
    { nameKo: '두랑고', nameEn: 'Durango' },
    { nameKo: '미초아칸', nameEn: 'Michoacán' },
    { nameKo: '사카테카스', nameEn: 'Zacatecas' },
    { nameKo: '과나후아토', nameEn: 'Guanajuato' },
    { nameKo: '푸에블라', nameEn: 'Puebla' },
  ],

  // ── 호주 (와인 / 위스키) ────────────────────────────────
  AU: [
    { nameKo: '빅토리아', nameEn: 'Victoria' },
    { nameKo: '뉴사우스웨일스', nameEn: 'New South Wales' },
    { nameKo: '사우스오스트레일리아', nameEn: 'South Australia' },
    { nameKo: '웨스턴오스트레일리아', nameEn: 'Western Australia' },
    { nameKo: '태즈메이니아', nameEn: 'Tasmania' },
    { nameKo: '퀸즐랜드', nameEn: 'Queensland' },
  ],

  // ── 캐나다 (캐나디안 위스키) ────────────────────────────
  CA: [
    { nameKo: '온타리오', nameEn: 'Ontario' },
    { nameKo: '브리티시컬럼비아', nameEn: 'British Columbia' },
    { nameKo: '앨버타', nameEn: 'Alberta' },
    { nameKo: '퀘벡', nameEn: 'Quebec' },
    { nameKo: '노바스코샤', nameEn: 'Nova Scotia' },
    { nameKo: '매니토바', nameEn: 'Manitoba' },
  ],

  // ── 대한민국 (전통주 / 위스키) ──────────────────────────
  KR: [
    { nameKo: '경기도', nameEn: 'Gyeonggi' },
    { nameKo: '전라도', nameEn: 'Jeolla' },
    { nameKo: '경상도', nameEn: 'Gyeongsang' },
    { nameKo: '충청도', nameEn: 'Chungcheong' },
    { nameKo: '강원도', nameEn: 'Gangwon' },
    { nameKo: '제주도', nameEn: 'Jeju' },
    { nameKo: '경상북도', nameEn: 'North Gyeongsang' },
    { nameKo: '경상남도', nameEn: 'South Gyeongsang' },
    { nameKo: '전라북도', nameEn: 'North Jeolla' },
    { nameKo: '전라남도', nameEn: 'South Jeolla' },
  ],

  // ── 대만 (위스키) ─────────────────────────────────────────
  TW: [
    { nameKo: '난터우', nameEn: 'Nantou' },
    { nameKo: '이란', nameEn: 'Yilan' },
    { nameKo: '타이베이', nameEn: 'Taipei' },
    { nameKo: '타이중', nameEn: 'Taichung' },
    { nameKo: '가오슝', nameEn: 'Kaohsiung' },
  ],

  // ── 인도 (위스키) ─────────────────────────────────────────
  IN: [
    { nameKo: '고아', nameEn: 'Goa' },
    { nameKo: '마하라슈트라', nameEn: 'Maharashtra' },
    { nameKo: '카르나타카', nameEn: 'Karnataka' },
    { nameKo: '케랄라', nameEn: 'Kerala' },
    { nameKo: '히마찰프라데시', nameEn: 'Himachal Pradesh' },
    { nameKo: '웨스트벵골', nameEn: 'West Bengal' },
  ],

  // ── 남아프리카공화국 (와인) ──────────────────────────────
  ZA: [
    { nameKo: '웨스턴케이프', nameEn: 'Western Cape' },
    { nameKo: '스텔렌보스', nameEn: 'Stellenbosch' },
    { nameKo: '프란스후크', nameEn: 'Franschhoek' },
    { nameKo: '파를', nameEn: 'Paarl' },
    { nameKo: '워커베이', nameEn: 'Walker Bay' },
    { nameKo: '로버트슨', nameEn: 'Robertson' },
  ],

  // ── 칠레 (와인) ───────────────────────────────────────────
  CL: [
    { nameKo: '마이포', nameEn: 'Maipo Valley' },
    { nameKo: '라펠', nameEn: 'Rapel Valley' },
    { nameKo: '콜차과', nameEn: 'Colchagua Valley' },
    { nameKo: '카사블랑카', nameEn: 'Casablanca Valley' },
    { nameKo: '마울레', nameEn: 'Maule Valley' },
    { nameKo: '아콩카과', nameEn: 'Aconcagua Valley' },
    { nameKo: '쿠리코', nameEn: 'Curicó Valley' },
    { nameKo: '비오비오', nameEn: 'Bío Bío Valley' },
  ],

  // ── 아르헨티나 (와인) ────────────────────────────────────
  AR: [
    { nameKo: '멘도사', nameEn: 'Mendoza' },
    { nameKo: '살타', nameEn: 'Salta' },
    { nameKo: '리오네그로', nameEn: 'Río Negro' },
    { nameKo: '산후안', nameEn: 'San Juan' },
    { nameKo: '라리오하', nameEn: 'La Rioja' },
    { nameKo: '네우켄', nameEn: 'Neuquén' },
  ],

  // ── 조지아 (와인) ────────────────────────────────────────
  GE: [
    { nameKo: '카헤티', nameEn: 'Kakheti' },
    { nameKo: '카르틀리', nameEn: 'Kartli' },
    { nameKo: '이메레티', nameEn: 'Imereti' },
    { nameKo: '사메그렐로', nameEn: 'Samegrelo' },
    { nameKo: '라차레츠후미', nameEn: 'Racha-Lechkhumi' },
  ],

  // ── 아르메니아 (브랜디) ──────────────────────────────────
  AM: [
    { nameKo: '예레반', nameEn: 'Yerevan' },
    { nameKo: '아라라트', nameEn: 'Ararat' },
    { nameKo: '타부쉬', nameEn: 'Tavush' },
    { nameKo: '게가르쿠니크', nameEn: 'Gegharkunik' },
  ],

  // ── 그리스 (와인) ────────────────────────────────────────
  GR: [
    { nameKo: '아티카', nameEn: 'Attica' },
    { nameKo: '크레타', nameEn: 'Crete' },
    { nameKo: '산토리니', nameEn: 'Santorini' },
    { nameKo: '펠로폰네소스', nameEn: 'Peloponnese' },
    { nameKo: '마케도니아', nameEn: 'Macedonia' },
    { nameKo: '에게해 섬', nameEn: 'Aegean Islands' },
  ],

  // ── 헝가리 (와인) ────────────────────────────────────────
  HU: [
    { nameKo: '토카이', nameEn: 'Tokaj' },
    { nameKo: '에게르', nameEn: 'Eger' },
    { nameKo: '빌라니', nameEn: 'Villány' },
    { nameKo: '소프론', nameEn: 'Sopron' },
    { nameKo: '벌러톤', nameEn: 'Balaton' },
  ],

  // ── 뉴질랜드 (와인) ──────────────────────────────────────
  NZ: [
    { nameKo: '말버러', nameEn: 'Marlborough' },
    { nameKo: '혹스베이', nameEn: "Hawke's Bay" },
    { nameKo: '센트럴오타고', nameEn: 'Central Otago' },
    { nameKo: '기즈번', nameEn: 'Gisborne' },
    { nameKo: '넬슨', nameEn: 'Nelson' },
    { nameKo: '와이라라파', nameEn: 'Wairarapa' },
  ],

  // ── 쿠바 (럼) ────────────────────────────────────────────
  CU: [
    { nameKo: '아바나', nameEn: 'Havana' },
    { nameKo: '산티아고데쿠바', nameEn: 'Santiago de Cuba' },
    { nameKo: '시에고데아빌라', nameEn: 'Ciego de Ávila' },
    { nameKo: '산크티스피리투스', nameEn: 'Sancti Spíritus' },
  ],

  // ── 자메이카 (럼) ────────────────────────────────────────
  JM: [
    { nameKo: '세인트캐서린', nameEn: 'Saint Catherine' },
    { nameKo: '클래런던', nameEn: 'Clarendon' },
    { nameKo: '세인트엘리자베스', nameEn: 'Saint Elizabeth' },
    { nameKo: '웨스트모어랜드', nameEn: 'Westmoreland' },
  ],

  // ── 바베이도스 (럼) ──────────────────────────────────────
  BB: [
    { nameKo: '세인트조지', nameEn: 'Saint George' },
    { nameKo: '세인트제임스', nameEn: 'Saint James' },
    { nameKo: '브리지타운', nameEn: 'Bridgetown' },
    { nameKo: '크라이스트처치', nameEn: 'Christ Church' },
  ],

  // ── 트리니다드 토바고 (럼) ───────────────────────────────
  TT: [
    { nameKo: '포트오브스페인', nameEn: 'Port of Spain' },
    { nameKo: '샌페르난도', nameEn: 'San Fernando' },
    { nameKo: '토바고', nameEn: 'Tobago' },
  ],

  // ── 루마니아 (와인) ──────────────────────────────────────
  RO: [
    { nameKo: '몰도바 (루마니아)', nameEn: 'Moldova Region' },
    { nameKo: '트란실바니아', nameEn: 'Transylvania' },
    { nameKo: '문테니아', nameEn: 'Muntenia' },
    { nameKo: '도브루자', nameEn: 'Dobrogea' },
  ],

  // ── 폴란드 (보드카 / 위스키) ────────────────────────────
  PL: [
    { nameKo: '마조비아', nameEn: 'Masovia' },
    { nameKo: '포드카르파티에', nameEn: 'Podkarpacie' },
    { nameKo: '말로폴스카', nameEn: 'Małopolska' },
    { nameKo: '실레지아', nameEn: 'Silesia' },
  ],
}
