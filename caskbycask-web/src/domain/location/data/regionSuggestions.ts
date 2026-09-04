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
    { nameKo: '하이랜드', nameEn: 'Highland' },
    { nameKo: '로우랜드', nameEn: 'Lowland' },
    { nameKo: '아일라', nameEn: 'Islay' },
    { nameKo: '캠벨타운', nameEn: 'Campbeltown' },
    { nameKo: '아일랜드 (섬)', nameEn: 'Islands' },
  ],

  // ── 잉글랜드 (영국 위스키 / 진) ─────────────────────────
  'GB-ENG': [
    { nameKo: '런던', nameEn: 'London' },
    { nameKo: '요크셔', nameEn: 'Yorkshire' },
    { nameKo: '노퍽', nameEn: 'Norfolk' },
    { nameKo: '컴브리아', nameEn: 'Cumbria' },
    { nameKo: '더비셔', nameEn: 'Derbyshire' },
    { nameKo: '코츠월드', nameEn: 'Cotswolds' },
    { nameKo: '콘월', nameEn: 'Cornwall' },
    { nameKo: '켄트', nameEn: 'Kent' },
    { nameKo: '서식스', nameEn: 'Sussex' },
    { nameKo: '햄프셔', nameEn: 'Hampshire' },
  ],

  // ── 웨일스 ────────────────────────────────────────────────
  'GB-WLS': [
    { nameKo: '포이스', nameEn: 'Powys' },
    { nameKo: '카마던셔', nameEn: 'Carmarthenshire' },
  ],

  // ── 북아일랜드 (아이리시 위스키) ─────────────────────────
  'GB-NIR': [
    { nameKo: '앤트림', nameEn: 'Antrim' },
    { nameKo: '다운', nameEn: 'Down' },
  ],

  // ── 아일랜드 (위스키) ─────────────────────────────────────
  IE: [
    { nameKo: '더블린', nameEn: 'Dublin' },
    { nameKo: '코크', nameEn: 'Cork' },
    { nameKo: '라우스', nameEn: 'Louth' },
    { nameKo: '웨스트미스', nameEn: 'Westmeath' },
    { nameKo: '오펄리', nameEn: 'Offaly' },
    { nameKo: '티퍼레리', nameEn: 'Tipperary' },
    { nameKo: '워터포드', nameEn: 'Waterford' },
    { nameKo: '칼로', nameEn: 'Carlow' },
    { nameKo: '골웨이', nameEn: 'Galway' },
    { nameKo: '케리', nameEn: 'Kerry' },
    { nameKo: '위클로', nameEn: 'Wicklow' },
    { nameKo: '미스', nameEn: 'Meath' },
    { nameKo: '클레어', nameEn: 'Clare' },
  ],

  // ── 프랑스 (꼬냑 / 아르마냑 / 와인) ──────────────────────
  FR: [
    { nameKo: '보르도', nameEn: 'Bordeaux' },
    { nameKo: '부르고뉴', nameEn: 'Burgundy' },
    { nameKo: '샹파뉴', nameEn: 'Champagne' },
    { nameKo: '알자스', nameEn: 'Alsace' },
    { nameKo: '루아르', nameEn: 'Loire Valley' },
    { nameKo: '론', nameEn: 'Rhône Valley' },
    { nameKo: '보졸레', nameEn: 'Beaujolais' },
    { nameKo: '프로방스', nameEn: 'Provence' },
    { nameKo: '랑그도크 루시용', nameEn: 'Languedoc-Roussillon' },
    { nameKo: '쉬드 우에스트', nameEn: 'South West France' },
    { nameKo: '쥐라', nameEn: 'Jura' },
    { nameKo: '사부아', nameEn: 'Savoie' },
    { nameKo: '코르시카', nameEn: 'Corsica' },
    { nameKo: '꼬냑', nameEn: 'Cognac' },
    { nameKo: '아르마냑', nameEn: 'Armagnac' },
    { nameKo: '칼바도스', nameEn: 'Calvados' },
    { nameKo: '브르타뉴', nameEn: 'Brittany' },
  ],

  // ── 미국 (버번 / 라이 / 와인) ────────────────────────────
  US: [
    { nameKo: '캘리포니아', nameEn: 'California' },
    { nameKo: '오리건', nameEn: 'Oregon' },
    { nameKo: '워싱턴', nameEn: 'Washington' },
    { nameKo: '뉴욕', nameEn: 'New York' },
    { nameKo: '켄터키', nameEn: 'Kentucky' },
    { nameKo: '테네시', nameEn: 'Tennessee' },
    { nameKo: '인디애나', nameEn: 'Indiana' },
    { nameKo: '텍사스', nameEn: 'Texas' },
    { nameKo: '펜실베이니아', nameEn: 'Pennsylvania' },
    { nameKo: '콜로라도', nameEn: 'Colorado' },
    { nameKo: '버지니아', nameEn: 'Virginia' },
    { nameKo: '버몬트', nameEn: 'Vermont' },
    { nameKo: '유타', nameEn: 'Utah' },
    { nameKo: '메릴랜드', nameEn: 'Maryland' },
  ],

  // ── 일본 (위스키) ─────────────────────────────────────────
  JP: [
    { nameKo: '홋카이도', nameEn: 'Hokkaido' },
    { nameKo: '이와테', nameEn: 'Iwate' },
    { nameKo: '미야기', nameEn: 'Miyagi' },
    { nameKo: '후쿠시마', nameEn: 'Fukushima' },
    { nameKo: '도치기', nameEn: 'Tochigi' },
    { nameKo: '사이타마', nameEn: 'Saitama' },
    { nameKo: '야마나시', nameEn: 'Yamanashi' },
    { nameKo: '나가노', nameEn: 'Nagano' },
    { nameKo: '도야마', nameEn: 'Toyama' },
    { nameKo: '시즈오카', nameEn: 'Shizuoka' },
    { nameKo: '아이치', nameEn: 'Aichi' },
    { nameKo: '시가', nameEn: 'Shiga' },
    { nameKo: '오사카', nameEn: 'Osaka' },
    { nameKo: '효고', nameEn: 'Hyogo' },
    { nameKo: '히로시마', nameEn: 'Hiroshima' },
    { nameKo: '가고시마', nameEn: 'Kagoshima' },
    { nameKo: '오이타', nameEn: 'Oita' },
    { nameKo: '와카야마', nameEn: 'Wakayama' },
  ],

  // ── 이탈리아 (와인) ───────────────────────────────────────
  IT: [
    { nameKo: '피에몬테', nameEn: 'Piedmont' },
    { nameKo: '토스카나', nameEn: 'Tuscany' },
    { nameKo: '베네토', nameEn: 'Veneto' },
    { nameKo: '롬바르디아', nameEn: 'Lombardy' },
    { nameKo: '트렌티노 알토 아디제', nameEn: 'Trentino-Alto Adige' },
    { nameKo: '프리울리', nameEn: 'Friuli-Venezia Giulia' },
    { nameKo: '에밀리아 로마냐', nameEn: 'Emilia-Romagna' },
    { nameKo: '마르케', nameEn: 'Marche' },
    { nameKo: '움브리아', nameEn: 'Umbria' },
    { nameKo: '아브루초', nameEn: 'Abruzzo' },
    { nameKo: '캄파니아', nameEn: 'Campania' },
    { nameKo: '풀리아', nameEn: 'Puglia' },
    { nameKo: '시칠리아', nameEn: 'Sicily' },
    { nameKo: '사르데냐', nameEn: 'Sardinia' },
  ],

  // ── 스페인 (와인 / 브랜디) ───────────────────────────────
  ES: [
    { nameKo: '리오하', nameEn: 'Rioja' },
    { nameKo: '카스티야 이 레온', nameEn: 'Castilla y León' },
    { nameKo: '카탈루냐', nameEn: 'Catalonia' },
    { nameKo: '갈리시아', nameEn: 'Galicia' },
    { nameKo: '안달루시아', nameEn: 'Andalusia' },
    { nameKo: '나바라', nameEn: 'Navarra' },
    { nameKo: '아라곤', nameEn: 'Aragón' },
    { nameKo: '발렌시아', nameEn: 'Valencia' },
    { nameKo: '카스티야 라 만차', nameEn: 'Castilla-La Mancha' },
    { nameKo: '무르시아', nameEn: 'Murcia' },
    { nameKo: '리베라 델 두에로', nameEn: 'Ribera del Duero' },
    { nameKo: '프리오라트', nameEn: 'Priorat' },
  ],

  // ── 포르투갈 (포트 / 와인) ───────────────────────────────
  PT: [
    { nameKo: '도루', nameEn: 'Douro' },
    { nameKo: '비뉴 베르드', nameEn: 'Vinho Verde' },
    { nameKo: '다웅', nameEn: 'Dão' },
    { nameKo: '바이라다', nameEn: 'Bairrada' },
    { nameKo: '리스보아', nameEn: 'Lisboa' },
    { nameKo: '알렌테주', nameEn: 'Alentejo' },
    { nameKo: '세투발', nameEn: 'Setúbal' },
    { nameKo: '마데이라', nameEn: 'Madeira' },
    { nameKo: '아소르스', nameEn: 'Açores' },
  ],

  // ── 독일 (라인와인 / 위스키) ────────────────────────────
  DE: [
    { nameKo: '모젤', nameEn: 'Mosel' },
    { nameKo: '라인가우', nameEn: 'Rheingau' },
    { nameKo: '라인헤센', nameEn: 'Rheinhessen' },
    { nameKo: '팔츠', nameEn: 'Pfalz' },
    { nameKo: '나헤', nameEn: 'Nahe' },
    { nameKo: '아르', nameEn: 'Ahr' },
    { nameKo: '미텔라인', nameEn: 'Mittelrhein' },
    { nameKo: '바덴', nameEn: 'Baden' },
    { nameKo: '뷔르템베르크', nameEn: 'Württemberg' },
    { nameKo: '프랑켄', nameEn: 'Franken' },
    { nameKo: '바이에른', nameEn: 'Bavaria' },
    { nameKo: '잘레 운스트루트', nameEn: 'Saale-Unstrut' },
    { nameKo: '작센', nameEn: 'Sachsen' },
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
    { nameKo: '사우스 오스트레일리아', nameEn: 'South Australia' },
    { nameKo: '빅토리아', nameEn: 'Victoria' },
    { nameKo: '뉴사우스웨일스', nameEn: 'New South Wales' },
    { nameKo: '웨스턴 오스트레일리아', nameEn: 'Western Australia' },
    { nameKo: '태즈메이니아', nameEn: 'Tasmania' },
  ],

  // ── 캐나다 (캐나디안 위스키) ────────────────────────────
  CA: [
    { nameKo: '온타리오', nameEn: 'Ontario' },
    { nameKo: '퀘벡', nameEn: 'Quebec' },
    { nameKo: '앨버타', nameEn: 'Alberta' },
    { nameKo: '브리티시컬럼비아', nameEn: 'British Columbia' },
    { nameKo: '매니토바', nameEn: 'Manitoba' },
    { nameKo: '노바스코샤', nameEn: 'Nova Scotia' },
  ],

  // ── 대한민국 (전통주 / 위스키) ──────────────────────────
  // 주류 등록이 쓰는 산지 카탈로그(WineRegion 의 KR_* 시도 17개)와 **같은 목록**이어야 한다.
  // 예전 목록의 '충청도·전라도·경상도' 는 카탈로그에 없는 통합 명칭이라, 그렇게 저장된 생산자는
  // 산지 코드가 끝내 붙지 않았다(LegacyWineRegionResolver 가 이름으로 찾는다).
  // 두 목록이 어긋나지 않는지는 `npm run test:region-label` 이 고정한다.
  KR: [
    { nameKo: '경기도', nameEn: 'Gyeonggi' },
    { nameKo: '강원도', nameEn: 'Gangwon' },
    { nameKo: '충청북도', nameEn: 'North Chungcheong' },
    { nameKo: '충청남도', nameEn: 'South Chungcheong' },
    { nameKo: '전라북도', nameEn: 'North Jeolla' },
    { nameKo: '전라남도', nameEn: 'South Jeolla' },
    { nameKo: '경상북도', nameEn: 'North Gyeongsang' },
    { nameKo: '경상남도', nameEn: 'South Gyeongsang' },
    { nameKo: '제주도', nameEn: 'Jeju' },
    { nameKo: '서울', nameEn: 'Seoul' },
    { nameKo: '인천', nameEn: 'Incheon' },
    { nameKo: '부산', nameEn: 'Busan' },
    { nameKo: '대구', nameEn: 'Daegu' },
    { nameKo: '대전', nameEn: 'Daejeon' },
    { nameKo: '광주', nameEn: 'Gwangju' },
    { nameKo: '울산', nameEn: 'Ulsan' },
    { nameKo: '세종', nameEn: 'Sejong' },
  ],

  // ── 대만 (위스키) ─────────────────────────────────────────
  TW: [
    { nameKo: '이란', nameEn: 'Yilan' },
    { nameKo: '난터우', nameEn: 'Nantou' },
    { nameKo: '타이중', nameEn: 'Taichung' },
    { nameKo: '타이베이', nameEn: 'Taipei' },
    { nameKo: '가오슝', nameEn: 'Kaohsiung' },
  ],

  // ── 인도 (위스키) ─────────────────────────────────────────
  IN: [
    { nameKo: '고아', nameEn: 'Goa' },
    { nameKo: '카르나타카', nameEn: 'Karnataka' },
    { nameKo: '우타르프라데시', nameEn: 'Uttar Pradesh' },
    { nameKo: '마하라슈트라', nameEn: 'Maharashtra' },
    { nameKo: '히마찰프라데시', nameEn: 'Himachal Pradesh' },
    { nameKo: '펀자브', nameEn: 'Punjab' },
    { nameKo: '하리아나', nameEn: 'Haryana' },
  ],

  // ── 남아프리카공화국 (와인) ──────────────────────────────
  ZA: [
    { nameKo: '케이프 와인랜드', nameEn: 'Cape Winelands' },
    { nameKo: '케이프타운', nameEn: 'Cape Town' },
    { nameKo: '오버버그', nameEn: 'Overberg' },
    { nameKo: '웨스트 코스트', nameEn: 'West Coast' },
    { nameKo: '가든 루트', nameEn: 'Garden Route' },
    { nameKo: '스텔렌보스', nameEn: 'Stellenbosch' },
    { nameKo: '파를', nameEn: 'Paarl' },
    { nameKo: '프란슈크', nameEn: 'Franschhoek' },
    { nameKo: '로버트슨', nameEn: 'Robertson' },
  ],

  // ── 칠레 (와인) ───────────────────────────────────────────
  CL: [
    { nameKo: '코킴보', nameEn: 'Coquimbo' },
    { nameKo: '아콩카과', nameEn: 'Aconcagua' },
    { nameKo: '센트럴 밸리', nameEn: 'Central Valley' },
    { nameKo: '칠레 남부', nameEn: 'Southern Chile' },
    { nameKo: '카사블랑카', nameEn: 'Casablanca Valley' },
    { nameKo: '마이포', nameEn: 'Maipo Valley' },
    { nameKo: '콜차과', nameEn: 'Colchagua Valley' },
    { nameKo: '쿠리코', nameEn: 'Curicó Valley' },
    { nameKo: '마울레', nameEn: 'Maule Valley' },
    { nameKo: '비오비오', nameEn: 'Bío Bío Valley' },
  ],

  // ── 아르헨티나 (와인) ────────────────────────────────────
  AR: [
    { nameKo: '멘도사', nameEn: 'Mendoza' },
    { nameKo: '살타', nameEn: 'Salta' },
    { nameKo: '산 후안', nameEn: 'San Juan' },
    { nameKo: '리오 네그로', nameEn: 'Río Negro' },
    { nameKo: '라 리오하', nameEn: 'La Rioja' },
    { nameKo: '네우켄', nameEn: 'Neuquén' },
    { nameKo: '카타마르카', nameEn: 'Catamarca' },
  ],

  // ── 조지아 (와인) ────────────────────────────────────────
  GE: [
    { nameKo: '카헤티', nameEn: 'Kakheti' },
    { nameKo: '카르틀리', nameEn: 'Kartli' },
    { nameKo: '이메레티', nameEn: 'Imereti' },
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
    { nameKo: '에게해 섬', nameEn: 'Aegean Islands' },
    { nameKo: '마케도니아', nameEn: 'Macedonia' },
    { nameKo: '펠로폰네소스', nameEn: 'Peloponnese' },
    { nameKo: '크레타', nameEn: 'Crete' },
    { nameKo: '아티카', nameEn: 'Attica' },
    { nameKo: '산토리니', nameEn: 'Santorini' },
  ],

  // ── 헝가리 (와인) ────────────────────────────────────────
  HU: [
    { nameKo: '토카이', nameEn: 'Tokaj' },
    { nameKo: '에게르', nameEn: 'Eger' },
    { nameKo: '빌라니', nameEn: 'Villány' },
    { nameKo: '세크사르드', nameEn: 'Szekszárd' },
    { nameKo: '바다초니', nameEn: 'Badacsony' },
    { nameKo: '솜로', nameEn: 'Somló' },
    { nameKo: '마트라', nameEn: 'Mátra' },
  ],

  // ── 뉴질랜드 (와인) ──────────────────────────────────────
  NZ: [
    { nameKo: '말버러', nameEn: 'Marlborough' },
    { nameKo: '호크스 베이', nameEn: "Hawke's Bay" },
    { nameKo: '오타고', nameEn: 'Otago' },
    { nameKo: '넬슨', nameEn: 'Nelson' },
    { nameKo: '오클랜드', nameEn: 'Auckland' },
    { nameKo: '캔터베리', nameEn: 'Canterbury' },
    { nameKo: '기스본', nameEn: 'Gisborne' },
    { nameKo: '와이라라파', nameEn: 'Wairarapa' },
    { nameKo: '센트럴 오타고', nameEn: 'Central Otago' },
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
