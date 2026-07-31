package com.caskbycask.domain.spirit.entity.enums;

import lombok.Getter;

import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * 산지 카탈로그 — 프로젝트 전체의 산지 단일 소스.
 *
 * <p>이름은 역사적으로 {@code WineRegion} 이지만 <b>와인 전용이 아니다</b>.
 * 각 산지는 {@code categories} 로 쓰이는 주류 카테고리를 선언한다
 * (와인 13개국 + 위스키 스코틀랜드·아일랜드·일본·대만·한국·인도·캐나다·미국).
 *
 * <p>계층은 2단이다.
 * <ul>
 *   <li><b>L1</b>(대산지, {@code parentCode == null}) — 국가 지도에 구역으로 그려진다. 예) 보르도, 스페이사이드</li>
 *   <li><b>L2</b>(세부산지) — L1 확대 지도에 구역으로 그려진다. 예) 메독</li>
 * </ul>
 *
 * <p>enum 상수명이 곧 코드({@code getCode()})이며 {@code spirit.region_code} 에 그대로 저장된다.
 * Java enum 은 생성자에서 다른 상수를 참조할 수 없으므로 부모는 <b>문자열 코드</b>로 지정하고
 * {@link #parent()} 에서 해석한다.
 *
 * <p><b>이름·계층·검증은 이 enum 이 소유</b>하고, 지도 도형(SVG path·마커 좌표)은
 * 프론트엔드 {@code caskbycask-web/src/domain/location/data/wineRegionMap/} 이 소유한다.
 * 산지를 추가할 때는 이 enum 과 프론트 기하 파일을 함께 수정해야 한다.
 *
 * <p>주의: 산지는 행정구역과 정확히 일치하지 않는다(보르도 ≈ 지롱드 주, 샹파뉴 ≈ 마른 주).
 * L1 은 겹치지 않는 단일 레벨이 되도록 국가별로 기준을 통일했다.
 * (스페인은 자치공동체를 L1, DO 를 L2 로 둔다 — 리오하/프리오라트가 같은 레벨에 오는 문제를 피하기 위함)
 * 단 스카치 하이랜드는 법정 정의상 스페이사이드를 지리적으로 포함한다 — 이는 규정 그대로다.
 */
@Getter
public enum WineRegion {

    // ═══════════════════════════════════════════════════════════
    // 프랑스 (FR)
    // ═══════════════════════════════════════════════════════════
    FR_BORDEAUX("FR", "보르도", "Bordeaux", null),
    FR_BORDEAUX_MEDOC("FR", "메독", "Médoc", "FR_BORDEAUX"),
    FR_BORDEAUX_SAINT_EMILION("FR", "생테밀리옹", "Saint-Émilion", "FR_BORDEAUX"),
    FR_BORDEAUX_POMEROL("FR", "포므롤", "Pomerol", "FR_BORDEAUX"),
    FR_BORDEAUX_GRAVES("FR", "그라브", "Graves", "FR_BORDEAUX"),
    FR_BORDEAUX_SAUTERNES("FR", "소테른", "Sauternes", "FR_BORDEAUX"),
    FR_BORDEAUX_ENTRE_DEUX_MERS("FR", "앙트르 되 메르", "Entre-Deux-Mers", "FR_BORDEAUX"),

    FR_BOURGOGNE("FR", "부르고뉴", "Burgundy", null),
    FR_BOURGOGNE_CHABLIS("FR", "샤블리", "Chablis", "FR_BOURGOGNE"),
    FR_BOURGOGNE_COTE_DE_NUITS("FR", "코트 드 뉘", "Côte de Nuits", "FR_BOURGOGNE"),
    FR_BOURGOGNE_COTE_DE_BEAUNE("FR", "코트 드 본", "Côte de Beaune", "FR_BOURGOGNE"),
    FR_BOURGOGNE_COTE_CHALONNAISE("FR", "코트 샬로네즈", "Côte Chalonnaise", "FR_BOURGOGNE"),
    FR_BOURGOGNE_MACONNAIS("FR", "마코네", "Mâconnais", "FR_BOURGOGNE"),

    FR_CHAMPAGNE("FR", "샹파뉴", "Champagne", null),

    FR_ALSACE("FR", "알자스", "Alsace", null),

    FR_LOIRE("FR", "루아르", "Loire Valley", null),
    FR_LOIRE_MUSCADET("FR", "뮈스카데", "Muscadet", "FR_LOIRE"),
    FR_LOIRE_ANJOU("FR", "앙주", "Anjou", "FR_LOIRE"),
    FR_LOIRE_VOUVRAY("FR", "부브레", "Vouvray", "FR_LOIRE"),
    FR_LOIRE_SANCERRE("FR", "상세르", "Sancerre", "FR_LOIRE"),

    FR_RHONE("FR", "론", "Rhône Valley", null),
    FR_RHONE_NORTHERN("FR", "북부 론", "Northern Rhône", "FR_RHONE"),
    FR_RHONE_SOUTHERN("FR", "남부 론", "Southern Rhône", "FR_RHONE"),

    FR_BEAUJOLAIS("FR", "보졸레", "Beaujolais", null),
    FR_PROVENCE("FR", "프로방스", "Provence", null),
    FR_LANGUEDOC("FR", "랑그도크 루시용", "Languedoc-Roussillon", null),
    FR_SUD_OUEST("FR", "쉬드 우에스트", "South West France", null),
    FR_JURA("FR", "쥐라", "Jura", null),
    FR_SAVOIE("FR", "사부아", "Savoie", null),
    FR_CORSE("FR", "코르시카", "Corsica", null),

    // ── 프랑스 — 꼬냑 (COGNAC) ─────────────────────────────────
    // 꼬냑 AOC 와 6개 크뤼는 INAO 가 코뮌 목록으로 정한 법정 구역이다.
    // 크뤼는 토양(백악질 비율)에 따른 등급 구분으로, 그랑드 샹파뉴가 최상위다.
    FR_COGNAC("FR", "꼬냑", "Cognac", null, SpiritCategory.COGNAC),
    FR_COGNAC_GRANDE_CHAMPAGNE("FR", "그랑드 샹파뉴", "Grande Champagne", "FR_COGNAC", SpiritCategory.COGNAC),
    FR_COGNAC_PETITE_CHAMPAGNE("FR", "프티트 샹파뉴", "Petite Champagne", "FR_COGNAC", SpiritCategory.COGNAC),
    FR_COGNAC_BORDERIES("FR", "보르드리", "Borderies", "FR_COGNAC", SpiritCategory.COGNAC),
    FR_COGNAC_FINS_BOIS("FR", "팽 부아", "Fins Bois", "FR_COGNAC", SpiritCategory.COGNAC),
    FR_COGNAC_BONS_BOIS("FR", "봉 부아", "Bons Bois", "FR_COGNAC", SpiritCategory.COGNAC),
    FR_COGNAC_BOIS_ORDINAIRES("FR", "부아 조르디네르", "Bois Ordinaires", "FR_COGNAC", SpiritCategory.COGNAC),

    // ── 프랑스 — 그 밖의 증류주 산지 (브랜디·위스키) ────────────
    FR_ARMAGNAC("FR", "아르마냑", "Armagnac", null, SpiritCategory.OTHER),
    FR_CALVADOS("FR", "칼바도스", "Calvados", null, SpiritCategory.OTHER),
    // 브르타뉴에는 법정 위스키 산지가 없어 4개 데파르트망(22·29·35·56)으로 근사한다
    FR_BRETAGNE("FR", "브르타뉴", "Brittany", null, SpiritCategory.WHISKY),

    // ═══════════════════════════════════════════════════════════
    // 이탈리아 (IT)
    // ═══════════════════════════════════════════════════════════
    IT_PIEMONTE("IT", "피에몬테", "Piedmont", null),
    IT_PIEMONTE_BAROLO("IT", "바롤로", "Barolo", "IT_PIEMONTE"),
    IT_PIEMONTE_BARBARESCO("IT", "바르바레스코", "Barbaresco", "IT_PIEMONTE"),
    IT_PIEMONTE_ASTI("IT", "아스티", "Asti", "IT_PIEMONTE"),

    IT_TOSCANA("IT", "토스카나", "Tuscany", null),
    IT_TOSCANA_CHIANTI_CLASSICO("IT", "키안티 클라시코", "Chianti Classico", "IT_TOSCANA"),
    IT_TOSCANA_MONTALCINO("IT", "몬탈치노", "Montalcino", "IT_TOSCANA"),
    IT_TOSCANA_MONTEPULCIANO("IT", "몬테풀치아노", "Montepulciano", "IT_TOSCANA"),
    IT_TOSCANA_BOLGHERI("IT", "볼게리", "Bolgheri", "IT_TOSCANA"),

    IT_VENETO("IT", "베네토", "Veneto", null),
    IT_VENETO_VALPOLICELLA("IT", "발폴리첼라", "Valpolicella", "IT_VENETO"),
    IT_VENETO_SOAVE("IT", "소아베", "Soave", "IT_VENETO"),
    IT_VENETO_PROSECCO("IT", "프로세코", "Prosecco", "IT_VENETO"),

    IT_LOMBARDIA("IT", "롬바르디아", "Lombardy", null),
    IT_TRENTINO_ALTO_ADIGE("IT", "트렌티노 알토 아디제", "Trentino-Alto Adige", null),
    IT_FRIULI("IT", "프리울리", "Friuli-Venezia Giulia", null),
    IT_EMILIA_ROMAGNA("IT", "에밀리아 로마냐", "Emilia-Romagna", null),
    IT_MARCHE("IT", "마르케", "Marche", null),
    IT_UMBRIA("IT", "움브리아", "Umbria", null),
    IT_ABRUZZO("IT", "아브루초", "Abruzzo", null),
    IT_CAMPANIA("IT", "캄파니아", "Campania", null),
    IT_PUGLIA("IT", "풀리아", "Puglia", null),
    IT_SICILIA("IT", "시칠리아", "Sicily", null),
    IT_SARDEGNA("IT", "사르데냐", "Sardinia", null),

    // ═══════════════════════════════════════════════════════════
    // 스페인 (ES) — L1 = 자치공동체, L2 = DO
    // ═══════════════════════════════════════════════════════════
    ES_RIOJA("ES", "리오하", "Rioja", null),
    ES_RIOJA_ALTA("ES", "리오하 알타", "Rioja Alta", "ES_RIOJA"),
    ES_RIOJA_ALAVESA("ES", "리오하 알라베사", "Rioja Alavesa", "ES_RIOJA"),
    ES_RIOJA_ORIENTAL("ES", "리오하 오리엔탈", "Rioja Oriental", "ES_RIOJA"),

    ES_CASTILLA_Y_LEON("ES", "카스티야 이 레온", "Castilla y León", null),
    ES_CASTILLA_Y_LEON_RIBERA_DEL_DUERO("ES", "리베라 델 두에로", "Ribera del Duero", "ES_CASTILLA_Y_LEON"),
    ES_CASTILLA_Y_LEON_RUEDA("ES", "루에다", "Rueda", "ES_CASTILLA_Y_LEON"),
    ES_CASTILLA_Y_LEON_TORO("ES", "토로", "Toro", "ES_CASTILLA_Y_LEON"),
    ES_CASTILLA_Y_LEON_BIERZO("ES", "비에르소", "Bierzo", "ES_CASTILLA_Y_LEON"),

    ES_CATALUNYA("ES", "카탈루냐", "Catalonia", null),
    ES_CATALUNYA_PRIORAT("ES", "프리오라트", "Priorat", "ES_CATALUNYA"),
    ES_CATALUNYA_PENEDES("ES", "페네데스", "Penedès", "ES_CATALUNYA"),
    ES_CATALUNYA_MONTSANT("ES", "몬산트", "Montsant", "ES_CATALUNYA"),

    ES_GALICIA("ES", "갈리시아", "Galicia", null),
    ES_GALICIA_RIAS_BAIXAS("ES", "리아스 바이사스", "Rías Baixas", "ES_GALICIA"),
    ES_GALICIA_RIBEIRA_SACRA("ES", "리베이라 사크라", "Ribeira Sacra", "ES_GALICIA"),
    ES_GALICIA_VALDEORRAS("ES", "발데오라스", "Valdeorras", "ES_GALICIA"),

    ES_ANDALUCIA("ES", "안달루시아", "Andalusia", null),
    ES_ANDALUCIA_JEREZ("ES", "헤레스", "Jerez-Xérès-Sherry", "ES_ANDALUCIA"),
    ES_ANDALUCIA_MONTILLA_MORILES("ES", "몬티야 모릴레스", "Montilla-Moriles", "ES_ANDALUCIA"),

    ES_NAVARRA("ES", "나바라", "Navarra", null),
    ES_ARAGON("ES", "아라곤", "Aragón", null),
    ES_VALENCIA("ES", "발렌시아", "Valencia", null),
    ES_CASTILLA_LA_MANCHA("ES", "카스티야 라 만차", "Castilla-La Mancha", null),
    ES_MURCIA("ES", "무르시아", "Murcia", null),
    ES_MURCIA_JUMILLA("ES", "후미야", "Jumilla", "ES_MURCIA"),

    // ═══════════════════════════════════════════════════════════
    // 미국 (US) — 본토 주요 와인 주
    // ═══════════════════════════════════════════════════════════
    US_CALIFORNIA("US", "캘리포니아", "California", null),
    US_CALIFORNIA_NAPA_VALLEY("US", "나파 밸리", "Napa Valley", "US_CALIFORNIA"),
    US_CALIFORNIA_SONOMA("US", "소노마", "Sonoma County", "US_CALIFORNIA"),
    US_CALIFORNIA_MENDOCINO("US", "멘도시노", "Mendocino County", "US_CALIFORNIA"),
    US_CALIFORNIA_LODI("US", "로다이", "Lodi", "US_CALIFORNIA"),
    US_CALIFORNIA_PASO_ROBLES("US", "파소 로블스", "Paso Robles", "US_CALIFORNIA"),
    US_CALIFORNIA_SANTA_BARBARA("US", "산타 바바라", "Santa Barbara County", "US_CALIFORNIA"),

    US_OREGON("US", "오리건", "Oregon", null),
    US_OREGON_WILLAMETTE_VALLEY("US", "윌라메트 밸리", "Willamette Valley", "US_OREGON"),

    US_WASHINGTON("US", "워싱턴", "Washington", null, SpiritCategory.WINE, SpiritCategory.WHISKY),
    US_WASHINGTON_COLUMBIA_VALLEY("US", "컬럼비아 밸리", "Columbia Valley", "US_WASHINGTON"),
    US_WASHINGTON_WALLA_WALLA("US", "왈라 왈라", "Walla Walla Valley", "US_WASHINGTON"),

    US_NEW_YORK("US", "뉴욕", "New York", null, SpiritCategory.WINE, SpiritCategory.WHISKY),
    US_NEW_YORK_FINGER_LAKES("US", "핑거 레이크스", "Finger Lakes", "US_NEW_YORK"),
    US_NEW_YORK_LONG_ISLAND("US", "롱 아일랜드", "Long Island", "US_NEW_YORK"),

    // ═══════════════════════════════════════════════════════════
    // 칠레 (CL) — L1 = 권역, L2 = 밸리
    // ═══════════════════════════════════════════════════════════
    CL_COQUIMBO("CL", "코킴보", "Coquimbo", null),
    CL_COQUIMBO_ELQUI("CL", "엘키", "Elqui Valley", "CL_COQUIMBO"),
    CL_COQUIMBO_LIMARI("CL", "리마리", "Limarí Valley", "CL_COQUIMBO"),
    CL_COQUIMBO_CHOAPA("CL", "초아파", "Choapa Valley", "CL_COQUIMBO"),

    CL_ACONCAGUA("CL", "아콩카과", "Aconcagua", null),
    CL_ACONCAGUA_VALLEY("CL", "아콩카과 밸리", "Aconcagua Valley", "CL_ACONCAGUA"),
    CL_ACONCAGUA_CASABLANCA("CL", "카사블랑카", "Casablanca Valley", "CL_ACONCAGUA"),
    CL_ACONCAGUA_SAN_ANTONIO("CL", "산안토니오", "San Antonio Valley", "CL_ACONCAGUA"),

    CL_CENTRAL_VALLEY("CL", "센트럴 밸리", "Central Valley", null),
    CL_CENTRAL_VALLEY_MAIPO("CL", "마이포", "Maipo Valley", "CL_CENTRAL_VALLEY"),
    CL_CENTRAL_VALLEY_CACHAPOAL("CL", "카차포알", "Cachapoal Valley", "CL_CENTRAL_VALLEY"),
    CL_CENTRAL_VALLEY_COLCHAGUA("CL", "콜차과", "Colchagua Valley", "CL_CENTRAL_VALLEY"),
    CL_CENTRAL_VALLEY_CURICO("CL", "쿠리코", "Curicó Valley", "CL_CENTRAL_VALLEY"),
    CL_CENTRAL_VALLEY_MAULE("CL", "마울레", "Maule Valley", "CL_CENTRAL_VALLEY"),

    CL_SOUTHERN("CL", "칠레 남부", "Southern Chile", null),
    CL_SOUTHERN_ITATA("CL", "이타타", "Itata Valley", "CL_SOUTHERN"),
    CL_SOUTHERN_BIO_BIO("CL", "비오비오", "Bío Bío Valley", "CL_SOUTHERN"),
    CL_SOUTHERN_MALLECO("CL", "말레코", "Malleco Valley", "CL_SOUTHERN"),

    // ═══════════════════════════════════════════════════════════
    // 호주 (AU) — L1 = 주(state), L2 = 산지
    // ═══════════════════════════════════════════════════════════
    AU_SOUTH_AUSTRALIA("AU", "사우스 오스트레일리아", "South Australia", null),
    AU_SOUTH_AUSTRALIA_BAROSSA_VALLEY("AU", "바로사 밸리", "Barossa Valley", "AU_SOUTH_AUSTRALIA"),
    AU_SOUTH_AUSTRALIA_EDEN_VALLEY("AU", "에덴 밸리", "Eden Valley", "AU_SOUTH_AUSTRALIA"),
    AU_SOUTH_AUSTRALIA_CLARE_VALLEY("AU", "클레어 밸리", "Clare Valley", "AU_SOUTH_AUSTRALIA"),
    AU_SOUTH_AUSTRALIA_MCLAREN_VALE("AU", "맥라렌 베일", "McLaren Vale", "AU_SOUTH_AUSTRALIA"),
    AU_SOUTH_AUSTRALIA_ADELAIDE_HILLS("AU", "애들레이드 힐스", "Adelaide Hills", "AU_SOUTH_AUSTRALIA"),
    AU_SOUTH_AUSTRALIA_COONAWARRA("AU", "쿠나와라", "Coonawarra", "AU_SOUTH_AUSTRALIA"),

    // 빅토리아·웨스턴 오스트레일리아는 와인과 위스키 산지를 겸한다 (스타워드·라임버너스 등)
    AU_VICTORIA("AU", "빅토리아", "Victoria", null, SpiritCategory.WINE, SpiritCategory.WHISKY),
    AU_VICTORIA_YARRA_VALLEY("AU", "야라 밸리", "Yarra Valley", "AU_VICTORIA"),
    AU_VICTORIA_MORNINGTON_PENINSULA("AU", "모닝턴 페닌슐라", "Mornington Peninsula", "AU_VICTORIA"),
    AU_VICTORIA_GEELONG("AU", "지롱", "Geelong", "AU_VICTORIA"),
    AU_VICTORIA_HEATHCOTE("AU", "히스코트", "Heathcote", "AU_VICTORIA"),
    AU_VICTORIA_RUTHERGLEN("AU", "러더글렌", "Rutherglen", "AU_VICTORIA"),

    AU_NEW_SOUTH_WALES("AU", "뉴사우스웨일스", "New South Wales", null),
    AU_NEW_SOUTH_WALES_HUNTER_VALLEY("AU", "헌터 밸리", "Hunter Valley", "AU_NEW_SOUTH_WALES"),
    AU_NEW_SOUTH_WALES_MUDGEE("AU", "머지", "Mudgee", "AU_NEW_SOUTH_WALES"),
    AU_NEW_SOUTH_WALES_ORANGE("AU", "오렌지", "Orange", "AU_NEW_SOUTH_WALES"),
    AU_NEW_SOUTH_WALES_CANBERRA_DISTRICT("AU", "캔버라 디스트릭트", "Canberra District", "AU_NEW_SOUTH_WALES"),

    AU_WESTERN_AUSTRALIA("AU", "웨스턴 오스트레일리아", "Western Australia", null, SpiritCategory.WINE, SpiritCategory.WHISKY),
    AU_WESTERN_AUSTRALIA_MARGARET_RIVER("AU", "마가렛 리버", "Margaret River", "AU_WESTERN_AUSTRALIA"),
    AU_WESTERN_AUSTRALIA_GREAT_SOUTHERN("AU", "그레이트 서던", "Great Southern", "AU_WESTERN_AUSTRALIA"),
    AU_WESTERN_AUSTRALIA_SWAN_DISTRICT("AU", "스완 디스트릭트", "Swan District", "AU_WESTERN_AUSTRALIA"),

    // 태즈메이니아는 와인과 위스키 산지를 겸한다 (설리반스 코브·라크 등)
    AU_TASMANIA("AU", "태즈메이니아", "Tasmania", null, SpiritCategory.WINE, SpiritCategory.WHISKY),
    AU_TASMANIA_TAMAR_VALLEY("AU", "태머 밸리", "Tamar Valley", "AU_TASMANIA"),
    AU_TASMANIA_COAL_RIVER("AU", "코얼 리버", "Coal River Valley", "AU_TASMANIA"),

    // ═══════════════════════════════════════════════════════════
    // 포르투갈 (PT)
    // ═══════════════════════════════════════════════════════════
    PT_DOURO("PT", "도루", "Douro", null),
    PT_VINHO_VERDE("PT", "비뉴 베르드", "Vinho Verde", null),
    PT_DAO("PT", "다웅", "Dão", null),
    PT_BAIRRADA("PT", "바이라다", "Bairrada", null),
    PT_LISBOA("PT", "리스보아", "Lisboa", null),
    PT_ALENTEJO("PT", "알렌테주", "Alentejo", null),
    PT_SETUBAL("PT", "세투발", "Setúbal", null),
    PT_MADEIRA("PT", "마데이라", "Madeira", null),
    PT_ACORES("PT", "아소르스", "Açores", null),

    // ═══════════════════════════════════════════════════════════
    // 독일 (DE) — L1 = 13개 재배지역(Anbaugebiet)
    // ═══════════════════════════════════════════════════════════
    DE_MOSEL("DE", "모젤", "Mosel", null),
    DE_RHEINGAU("DE", "라인가우", "Rheingau", null),
    DE_RHEINHESSEN("DE", "라인헤센", "Rheinhessen", null),
    DE_PFALZ("DE", "팔츠", "Pfalz", null),
    DE_NAHE("DE", "나헤", "Nahe", null),
    DE_AHR("DE", "아르", "Ahr", null),
    DE_MITTELRHEIN("DE", "미텔라인", "Mittelrhein", null),
    DE_BADEN("DE", "바덴", "Baden", null),
    DE_WUERTTEMBERG("DE", "뷔르템베르크", "Württemberg", null),
    DE_FRANKEN("DE", "프랑켄", "Franken", null),
    // 바이에른은 독일 위스키(슬리레르제 등) 산지다 — 와인 산지 프랑켄과 구역이 겹친다
    DE_BAYERN("DE", "바이에른", "Bavaria", null, SpiritCategory.WHISKY),
    DE_SAALE_UNSTRUT("DE", "잘레 운스트루트", "Saale-Unstrut", null),
    DE_SACHSEN("DE", "작센", "Sachsen", null),

    // ═══════════════════════════════════════════════════════════
    // 오스트리아 (AT) — L1 = 4개 재배지역(Weinbauregion)
    // ═══════════════════════════════════════════════════════════
    AT_NIEDEROSTERREICH("AT", "니더외스터라이히", "Niederösterreich", null),
    AT_NIEDEROSTERREICH_WEINVIERTEL("AT", "바인피어텔", "Weinviertel", "AT_NIEDEROSTERREICH"),
    AT_NIEDEROSTERREICH_WACHAU("AT", "바하우", "Wachau", "AT_NIEDEROSTERREICH"),
    AT_NIEDEROSTERREICH_KAMPTAL("AT", "캄프탈", "Kamptal", "AT_NIEDEROSTERREICH"),
    AT_NIEDEROSTERREICH_KREMSTAL("AT", "크렘스탈", "Kremstal", "AT_NIEDEROSTERREICH"),

    AT_BURGENLAND("AT", "부르겐란트", "Burgenland", null),
    AT_STEIERMARK("AT", "슈타이어마르크", "Steiermark", null),
    AT_WIEN("AT", "빈", "Wien", null),

    // ═══════════════════════════════════════════════════════════
    // 헝가리 (HU) — L1 = 주요 보르비데크(borvidék)
    // ═══════════════════════════════════════════════════════════
    HU_TOKAJ("HU", "토카이", "Tokaj", null),
    HU_EGER("HU", "에게르", "Eger", null),
    HU_VILLANY("HU", "빌라니", "Villány", null),
    HU_SZEKSZARD("HU", "세크사르드", "Szekszárd", null),
    HU_BADACSONY("HU", "바다초니", "Badacsony", null),
    HU_SOMLO("HU", "솜로", "Somló", null),
    HU_MATRA("HU", "마트라", "Mátra", null),

    // ═══════════════════════════════════════════════════════════
    // 뉴질랜드 (NZ)
    // ═══════════════════════════════════════════════════════════
    NZ_MARLBOROUGH("NZ", "말버러", "Marlborough", null),
    NZ_HAWKES_BAY("NZ", "호크스 베이", "Hawke's Bay", null),
    NZ_OTAGO("NZ", "오타고", "Otago", null),
    NZ_OTAGO_CENTRAL_OTAGO("NZ", "센트럴 오타고", "Central Otago", "NZ_OTAGO"),
    NZ_NELSON("NZ", "넬슨", "Nelson", null),
    NZ_AUCKLAND("NZ", "오클랜드", "Auckland", null),
    NZ_CANTERBURY("NZ", "캔터베리", "Canterbury", null),
    NZ_GISBORNE("NZ", "기스본", "Gisborne", null),
    NZ_WAIRARAPA("NZ", "와이라라파", "Wairarapa", null),

    // ═══════════════════════════════════════════════════════════
    // 아르헨티나 (AR) — L1 = 주(provincia)가 곧 산지
    // ═══════════════════════════════════════════════════════════
    AR_MENDOZA("AR", "멘도사", "Mendoza", null),
    AR_MENDOZA_LUJAN_DE_CUYO("AR", "루한 데 쿠요", "Luján de Cuyo", "AR_MENDOZA"),
    AR_MENDOZA_MAIPU("AR", "마이푸", "Maipú", "AR_MENDOZA"),
    AR_MENDOZA_VALLE_DE_UCO("AR", "발레 데 우코", "Valle de Uco", "AR_MENDOZA"),
    AR_MENDOZA_SAN_RAFAEL("AR", "산 라파엘", "San Rafael", "AR_MENDOZA"),

    AR_SALTA("AR", "살타", "Salta", null),
    AR_SAN_JUAN("AR", "산 후안", "San Juan", null),
    AR_RIO_NEGRO("AR", "리오 네그로", "Río Negro", null),
    AR_LA_RIOJA("AR", "라 리오하", "La Rioja", null),
    AR_NEUQUEN("AR", "네우켄", "Neuquén", null),
    AR_CATAMARCA("AR", "카타마르카", "Catamarca", null),

    // ═══════════════════════════════════════════════════════════
    // 남아프리카 공화국 (ZA) — L1 = 와인 오브 오리진 권역
    // ═══════════════════════════════════════════════════════════
    // 케이프 와인랜드는 와인과 남아공 위스키(웰링턴의 제임스 세지윅)를 겸한다
    ZA_CAPE_WINELANDS("ZA", "케이프 와인랜드", "Cape Winelands", null, SpiritCategory.WINE, SpiritCategory.WHISKY),
    ZA_CAPE_WINELANDS_STELLENBOSCH("ZA", "스텔렌보스", "Stellenbosch", "ZA_CAPE_WINELANDS"),
    ZA_CAPE_WINELANDS_PAARL("ZA", "파를", "Paarl", "ZA_CAPE_WINELANDS"),
    ZA_CAPE_WINELANDS_FRANSCHHOEK("ZA", "프란슈크", "Franschhoek", "ZA_CAPE_WINELANDS"),
    ZA_CAPE_WINELANDS_ROBERTSON("ZA", "로버트슨", "Robertson", "ZA_CAPE_WINELANDS"),

    ZA_CAPE_TOWN("ZA", "케이프타운", "Cape Town", null),
    ZA_OVERBERG("ZA", "오버버그", "Overberg", null),
    ZA_WEST_COAST("ZA", "웨스트 코스트", "West Coast", null),
    ZA_GARDEN_ROUTE("ZA", "가든 루트", "Garden Route", null),

    // ═══════════════════════════════════════════════════════════
    // 스코틀랜드 (GB-SCT) — 위스키
    //
    // 스카치 위스키 규정(The Scotch Whisky Regulations 2009) 제10조가 정한
    // 법정 지리적 표시 5개다. 보호 지역(protected locality) 2개 = 캠벨타운·아일라,
    // 보호 권역(protected region) 3개 = 하이랜드·로우랜드·스페이사이드.
    //   · 캠벨타운  = Argyll and Bute 의회의 South Kintyre ward
    //   · 아일라    = 아일라 섬 전체
    //   · 스페이사이드 = Moray 의회 8개 ward(= Moray 전역) + Highland 의회 Badenoch and Strathspey ward
    //   · 하이랜드/로우랜드 = 법정 분할선(그리녹–카드로스–얼즈 시트–월리스 기념탑–A91–M90–언 강–테이 강) 북/남
    // '아일랜드(섬)' 은 법정 표시가 아니라 업계 통용 구분이지만 국내 표기·유통에서
    // 널리 쓰이므로 실제 섬 경계로 구성해 함께 제공한다.
    // ═══════════════════════════════════════════════════════════
    GB_SCT_SPEYSIDE("GB-SCT", "스페이사이드", "Speyside", null, SpiritCategory.WHISKY),
    GB_SCT_HIGHLAND("GB-SCT", "하이랜드", "Highland", null, SpiritCategory.WHISKY),
    GB_SCT_LOWLAND("GB-SCT", "로우랜드", "Lowland", null, SpiritCategory.WHISKY),
    GB_SCT_ISLAY("GB-SCT", "아일라", "Islay", null, SpiritCategory.WHISKY),
    GB_SCT_CAMPBELTOWN("GB-SCT", "캠벨타운", "Campbeltown", null, SpiritCategory.WHISKY),
    GB_SCT_ISLANDS("GB-SCT", "아일랜드 (섬)", "Islands", null, SpiritCategory.WHISKY),

    // ═══════════════════════════════════════════════════════════
    // 아일랜드 (IE) — 위스키. L1 = 카운티
    // 아이리시 위스키에는 법정 세부 산지가 없어 증류소가 있는 카운티를 쓴다.
    // 부시밀스(앤트림)는 북아일랜드(GB-NIR)라 여기 포함되지 않는다.
    // ═══════════════════════════════════════════════════════════
    IE_DUBLIN("IE", "더블린", "Dublin", null, SpiritCategory.WHISKY),
    IE_CORK("IE", "코크", "Cork", null, SpiritCategory.WHISKY),
    IE_LOUTH("IE", "라우스", "Louth", null, SpiritCategory.WHISKY),
    IE_WESTMEATH("IE", "웨스트미스", "Westmeath", null, SpiritCategory.WHISKY),
    IE_OFFALY("IE", "오펄리", "Offaly", null, SpiritCategory.WHISKY),
    IE_TIPPERARY("IE", "티퍼레리", "Tipperary", null, SpiritCategory.WHISKY),
    IE_WATERFORD("IE", "워터포드", "Waterford", null, SpiritCategory.WHISKY),
    IE_CARLOW("IE", "칼로", "Carlow", null, SpiritCategory.WHISKY),
    IE_GALWAY("IE", "골웨이", "Galway", null, SpiritCategory.WHISKY),
    IE_KERRY("IE", "케리", "Kerry", null, SpiritCategory.WHISKY),
    IE_WICKLOW("IE", "위클로", "Wicklow", null, SpiritCategory.WHISKY),
    IE_MEATH("IE", "미스", "Meath", null, SpiritCategory.WHISKY),
    IE_CLARE("IE", "클레어", "Clare", null, SpiritCategory.WHISKY),

    // ═══════════════════════════════════════════════════════════
    // 일본 (JP) — 위스키. L1 = 도도부현
    // 재팬 위스키에도 법정 산지가 없어 증류소 소재 도도부현을 쓴다.
    // ═══════════════════════════════════════════════════════════
    JP_HOKKAIDO("JP", "홋카이도", "Hokkaido", null, SpiritCategory.WHISKY),
    JP_IWATE("JP", "이와테", "Iwate", null, SpiritCategory.WHISKY),
    JP_MIYAGI("JP", "미야기", "Miyagi", null, SpiritCategory.WHISKY),
    JP_FUKUSHIMA("JP", "후쿠시마", "Fukushima", null, SpiritCategory.WHISKY),
    JP_TOCHIGI("JP", "도치기", "Tochigi", null, SpiritCategory.WINE),
    JP_SAITAMA("JP", "사이타마", "Saitama", null, SpiritCategory.WHISKY),
    // 야마나시는 재팬 위스키(하쿠슈)와 일본 와인(고슈)의 중심지를 겸한다
    JP_YAMANASHI("JP", "야마나시", "Yamanashi", null, SpiritCategory.WHISKY, SpiritCategory.WINE),
    JP_NAGANO("JP", "나가노", "Nagano", null, SpiritCategory.WHISKY),
    JP_TOYAMA("JP", "도야마", "Toyama", null, SpiritCategory.WHISKY),
    JP_SHIZUOKA("JP", "시즈오카", "Shizuoka", null, SpiritCategory.WHISKY),
    JP_AICHI("JP", "아이치", "Aichi", null, SpiritCategory.WHISKY),
    JP_SHIGA("JP", "시가", "Shiga", null, SpiritCategory.WHISKY),
    JP_OSAKA("JP", "오사카", "Osaka", null, SpiritCategory.WHISKY),
    JP_HYOGO("JP", "효고", "Hyogo", null, SpiritCategory.WHISKY),
    JP_HIROSHIMA("JP", "히로시마", "Hiroshima", null, SpiritCategory.WHISKY),
    JP_KAGOSHIMA("JP", "가고시마", "Kagoshima", null, SpiritCategory.WHISKY),
    JP_OITA("JP", "오이타", "Oita", null, SpiritCategory.WHISKY),
    JP_WAKAYAMA("JP", "와카야마", "Wakayama", null, SpiritCategory.WHISKY),

    // ═══════════════════════════════════════════════════════════
    // 대만 (TW) — 위스키. L1 = 현·시
    // ═══════════════════════════════════════════════════════════
    TW_YILAN("TW", "이란", "Yilan", null, SpiritCategory.WHISKY),
    TW_NANTOU("TW", "난터우", "Nantou", null, SpiritCategory.WHISKY),
    TW_TAICHUNG("TW", "타이중", "Taichung", null, SpiritCategory.WHISKY),
    TW_TAIPEI("TW", "타이베이", "Taipei", null, SpiritCategory.WHISKY),
    TW_KAOHSIUNG("TW", "가오슝", "Kaohsiung", null, SpiritCategory.WHISKY),

    // ═══════════════════════════════════════════════════════════
    // 대한민국 (KR) — 위스키·전통주. L1 = 시도
    // ═══════════════════════════════════════════════════════════
    KR_GYEONGGI("KR", "경기도", "Gyeonggi", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_GANGWON("KR", "강원도", "Gangwon", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_CHUNGBUK("KR", "충청북도", "North Chungcheong", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_CHUNGNAM("KR", "충청남도", "South Chungcheong", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_JEONBUK("KR", "전라북도", "North Jeolla", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_JEONNAM("KR", "전라남도", "South Jeolla", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_GYEONGBUK("KR", "경상북도", "North Gyeongsang", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_GYEONGNAM("KR", "경상남도", "South Gyeongsang", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_JEJU("KR", "제주도", "Jeju", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_SEOUL("KR", "서울", "Seoul", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_INCHEON("KR", "인천", "Incheon", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_BUSAN("KR", "부산", "Busan", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_DAEGU("KR", "대구", "Daegu", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_DAEJEON("KR", "대전", "Daejeon", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_GWANGJU("KR", "광주", "Gwangju", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_ULSAN("KR", "울산", "Ulsan", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),
    KR_SEJONG("KR", "세종", "Sejong", null, SpiritCategory.WHISKY, SpiritCategory.OTHER),

    // ═══════════════════════════════════════════════════════════
    // 인도 (IN) — 위스키. L1 = 주
    // ═══════════════════════════════════════════════════════════
    IN_GOA("IN", "고아", "Goa", null, SpiritCategory.WHISKY),
    // 카르나타카(암룻·난디 힐스)·마하라슈트라(나시크)는 위스키와 와인을 겸한다
    IN_KARNATAKA("IN", "카르나타카", "Karnataka", null, SpiritCategory.WHISKY, SpiritCategory.WINE),
    IN_UTTAR_PRADESH("IN", "우타르프라데시", "Uttar Pradesh", null, SpiritCategory.WHISKY),
    IN_MAHARASHTRA("IN", "마하라슈트라", "Maharashtra", null, SpiritCategory.WHISKY, SpiritCategory.WINE),
    IN_HIMACHAL_PRADESH("IN", "히마찰프라데시", "Himachal Pradesh", null, SpiritCategory.WHISKY),
    IN_PUNJAB("IN", "펀자브", "Punjab", null, SpiritCategory.WHISKY),
    IN_HARYANA("IN", "하리아나", "Haryana", null, SpiritCategory.WHISKY),

    // ═══════════════════════════════════════════════════════════
    // 캐나다 (CA) — 위스키. L1 = 주·준주
    // ═══════════════════════════════════════════════════════════
    // 온타리오는 캐나디안 위스키와 아이스와인(나이아가라)을 겸한다
    CA_ONTARIO("CA", "온타리오", "Ontario", null, SpiritCategory.WHISKY, SpiritCategory.WINE),
    CA_QUEBEC("CA", "퀘벡", "Quebec", null, SpiritCategory.WHISKY),
    CA_ALBERTA("CA", "앨버타", "Alberta", null, SpiritCategory.WHISKY),
    CA_BRITISH_COLUMBIA("CA", "브리티시컬럼비아", "British Columbia", null, SpiritCategory.WHISKY),
    CA_MANITOBA("CA", "매니토바", "Manitoba", null, SpiritCategory.WHISKY),
    CA_NOVA_SCOTIA("CA", "노바스코샤", "Nova Scotia", null, SpiritCategory.WHISKY),

    // ═══════════════════════════════════════════════════════════
    // 미국 (US) — 위스키. 기존 와인 지도(us.ts)의 주 경계를 재사용한다.
    // ═══════════════════════════════════════════════════════════
    US_KENTUCKY("US", "켄터키", "Kentucky", null, SpiritCategory.WHISKY),
    US_TENNESSEE("US", "테네시", "Tennessee", null, SpiritCategory.WHISKY),
    US_INDIANA("US", "인디애나", "Indiana", null, SpiritCategory.WHISKY),
    US_TEXAS("US", "텍사스", "Texas", null, SpiritCategory.WHISKY),
    US_PENNSYLVANIA("US", "펜실베이니아", "Pennsylvania", null, SpiritCategory.WHISKY),
    US_COLORADO("US", "콜로라도", "Colorado", null, SpiritCategory.WHISKY),
    US_VIRGINIA("US", "버지니아", "Virginia", null, SpiritCategory.WHISKY),
    US_VERMONT("US", "버몬트", "Vermont", null, SpiritCategory.WHISKY),
    US_UTAH("US", "유타", "Utah", null, SpiritCategory.WHISKY),
    US_MARYLAND("US", "메릴랜드", "Maryland", null, SpiritCategory.WHISKY),

    // ═══════════════════════════════════════════════════════════
    // 잉글랜드 (GB-ENG) — 위스키·와인
    // 법정 산지가 없어 의례주(ceremonial county)·통합자치구로 근사한다.
    // 잉글리시 스파클링 와인은 켄트·서식스·햄프셔에 집중되어 있다.
    // ═══════════════════════════════════════════════════════════
    GB_ENG_LONDON("GB-ENG", "런던", "London", null, SpiritCategory.WHISKY),
    GB_ENG_YORKSHIRE("GB-ENG", "요크셔", "Yorkshire", null, SpiritCategory.WHISKY),
    GB_ENG_NORFOLK("GB-ENG", "노퍽", "Norfolk", null, SpiritCategory.WHISKY),
    GB_ENG_CUMBRIA("GB-ENG", "컴브리아", "Cumbria", null, SpiritCategory.WHISKY),
    GB_ENG_DERBYSHIRE("GB-ENG", "더비셔", "Derbyshire", null, SpiritCategory.WHISKY),
    // 코츠월드는 여러 주에 걸친 자연경관구역이라 중심 주인 글로스터셔로 근사한다
    GB_ENG_COTSWOLDS("GB-ENG", "코츠월드", "Cotswolds", null, SpiritCategory.WHISKY),
    GB_ENG_CORNWALL("GB-ENG", "콘월", "Cornwall", null, SpiritCategory.WHISKY),
    GB_ENG_KENT("GB-ENG", "켄트", "Kent", null, SpiritCategory.WINE, SpiritCategory.WHISKY),
    GB_ENG_SUSSEX("GB-ENG", "서식스", "Sussex", null, SpiritCategory.WINE),
    GB_ENG_HAMPSHIRE("GB-ENG", "햄프셔", "Hampshire", null, SpiritCategory.WINE),

    // ═══════════════════════════════════════════════════════════
    // 웨일스 (GB-WLS) · 북아일랜드 (GB-NIR) — 위스키
    // ═══════════════════════════════════════════════════════════
    // 브레컨 비콘스 국립공원은 포이스 주 안에 있다
    GB_WLS_POWYS("GB-WLS", "포이스", "Powys", null, SpiritCategory.WHISKY),
    GB_WLS_CARMARTHENSHIRE("GB-WLS", "카마던셔", "Carmarthenshire", null, SpiritCategory.WHISKY),

    // 부시밀스가 있는 앤트림 북부는 현행 자치구 Causeway Coast and Glens 에 속한다
    GB_NIR_ANTRIM("GB-NIR", "앤트림", "Antrim", null, SpiritCategory.WHISKY),
    GB_NIR_DOWN("GB-NIR", "다운", "Down", null, SpiritCategory.WHISKY),

    // ═══════════════════════════════════════════════════════════
    // 유럽 위스키 신흥국 — 스웨덴·네덜란드·덴마크·핀란드
    // ═══════════════════════════════════════════════════════════
    SE_GAVLEBORG("SE", "옙플레", "Gävle", null, SpiritCategory.WHISKY),
    SE_VASTERNORRLAND("SE", "회가 쿠스텐", "High Coast", null, SpiritCategory.WHISKY),
    NL_NOORD_BRABANT("NL", "노르트브라반트", "North Brabant", null, SpiritCategory.WHISKY),
    DK_MIDTJYLLAND("DK", "윌란", "Jutland", null, SpiritCategory.WHISKY),
    FI_OSTROBOTHNIA("FI", "오스트로보스니아", "Ostrobothnia", null, SpiritCategory.WHISKY),

    // ═══════════════════════════════════════════════════════════
    // 이스라엘 (IL) — 위스키
    // ═══════════════════════════════════════════════════════════
    IL_TEL_AVIV("IL", "텔아비브", "Tel Aviv", null, SpiritCategory.WHISKY),

    // ═══════════════════════════════════════════════════════════
    // 중국 (CN) — 와인
    // ═══════════════════════════════════════════════════════════
    CN_NINGXIA("CN", "닝샤", "Ningxia", null),
    CN_SHANDONG("CN", "산둥", "Shandong", null),
    CN_YUNNAN("CN", "윈난", "Yunnan", null),
    CN_SHANXI("CN", "산시", "Shanxi", null),
    CN_XINJIANG("CN", "신장", "Xinjiang", null),
    CN_HEBEI("CN", "허베이", "Hebei", null),

    // ═══════════════════════════════════════════════════════════
    // 그리스 (GR) — 와인. L1 = 행정 광역권
    // ═══════════════════════════════════════════════════════════
    GR_AEGEAN("GR", "에게해 섬", "Aegean Islands", null),
    GR_MACEDONIA("GR", "마케도니아", "Macedonia", null),
    GR_PELOPONNESE("GR", "펠로폰네소스", "Peloponnese", null),
    GR_CRETE("GR", "크레타", "Crete", null),
    GR_ATTICA("GR", "아티카", "Attica", null),

    // ═══════════════════════════════════════════════════════════
    // 조지아 (GE) — 와인
    // ═══════════════════════════════════════════════════════════
    GE_KAKHETI("GE", "카헤티", "Kakheti", null),
    GE_KARTLI("GE", "카르틀리", "Kartli", null),
    GE_IMERETI("GE", "이메레티", "Imereti", null),

    // ═══════════════════════════════════════════════════════════
    // 레바논 (LB) — 와인
    // ═══════════════════════════════════════════════════════════
    LB_BEQAA("LB", "베카 밸리", "Beqaa Valley", null),

    // ═══════════════════════════════════════════════════════════
    // 우루과이 (UY) — 와인
    // ═══════════════════════════════════════════════════════════
    UY_MALDONADO("UY", "마이도나도", "Maldonado", null),
    UY_CANELONES("UY", "카넬로네스", "Canelones", null),
    ;

    /** {@code spirit.region_code} 컬럼 길이와 맞춰야 하는 코드 최대 길이 */
    public static final int MAX_CODE_LENGTH = 40;

    /** ISO 3166-1 alpha-2 국가 코드 (스코틀랜드처럼 원산지로 통용되는 ISO 3166-2 코드 포함) */
    private final String countryCode;
    private final String nameKo;
    private final String nameEn;
    /** 상위 L1 코드 — L1 자신은 null */
    private final String parentCode;
    /**
     * 이 산지가 쓰이는 주류 카테고리.
     *
     * <p>미국·프랑스·호주처럼 와인과 위스키가 같은 국가에서 겹치므로
     * 관리자 산지 목록은 카테고리로 걸러야 한다(버번 등록 화면에 나파 밸리가 나오면 안 된다).
     * 기존 와인 산지는 4-인자 생성자를 그대로 쓰며 자동으로 {@code WINE} 이 된다.
     */
    private final Set<SpiritCategory> categories;

    WineRegion(String countryCode, String nameKo, String nameEn, String parentCode) {
        this(countryCode, nameKo, nameEn, parentCode, SpiritCategory.WINE);
    }

    WineRegion(String countryCode, String nameKo, String nameEn, String parentCode,
               SpiritCategory... categories) {
        this.countryCode = countryCode;
        this.nameKo = nameKo;
        this.nameEn = nameEn;
        this.parentCode = parentCode;
        this.categories = Collections.unmodifiableSet(EnumSet.copyOf(List.of(categories)));
    }

    // ── 조회용 정적 인덱스 (enum 상수 초기화 이후 1회 구성) ──────────
    private static final Map<String, List<WineRegion>> TOP_LEVELS_BY_COUNTRY;
    private static final Map<WineRegion, List<WineRegion>> CHILDREN;
    private static final List<String> COUNTRY_CODES;

    static {
        Map<String, List<WineRegion>> tops = new LinkedHashMap<>();
        Map<WineRegion, List<WineRegion>> children = new EnumMap<>(WineRegion.class);
        Set<String> countries = new LinkedHashSet<>();

        for (WineRegion region : values()) {
            countries.add(region.countryCode);
            if (region.parentCode == null) {
                tops.computeIfAbsent(region.countryCode, k -> new java.util.ArrayList<>()).add(region);
                children.computeIfAbsent(region, k -> new java.util.ArrayList<>());
            }
        }
        for (WineRegion region : values()) {
            if (region.parentCode != null) {
                // 잘못된 parentCode 는 클래스 로딩 시점에 즉시 실패시켜 배포 전에 잡는다
                WineRegion parent = WineRegion.valueOf(region.parentCode);
                if (parent.parentCode != null) {
                    throw new IllegalStateException(
                            "WineRegion 은 2계층만 허용한다 (L2 의 부모가 L2): " + region.name());
                }
                children.computeIfAbsent(parent, k -> new java.util.ArrayList<>()).add(region);
            }
        }

        TOP_LEVELS_BY_COUNTRY = tops.entrySet().stream().collect(
                LinkedHashMap::new,
                (map, e) -> map.put(e.getKey(), List.copyOf(e.getValue())),
                LinkedHashMap::putAll);
        Map<WineRegion, List<WineRegion>> frozen = new EnumMap<>(WineRegion.class);
        children.forEach((parent, list) -> frozen.put(parent, List.copyOf(list)));
        CHILDREN = Collections.unmodifiableMap(frozen);
        COUNTRY_CODES = List.copyOf(countries);
    }

    /** {@code spirit.region_code} 에 저장되는 값 */
    public String getCode() {
        return name();
    }

    public boolean isTopLevel() {
        return parentCode == null;
    }

    /** 상위 L1 — L1 자신은 null */
    public WineRegion parent() {
        return parentCode == null ? null : WineRegion.valueOf(parentCode);
    }

    /**
     * 지역 필터·목록 표시에 사용할 L1. 자신이 L1 이면 자신을 반환한다.
     * {@code spirit.region} 텍스트 동기화 기준이다.
     */
    public WineRegion topLevel() {
        return parentCode == null ? this : WineRegion.valueOf(parentCode);
    }

    /** 하위 L2 목록 — L2 는 항상 빈 목록 */
    public List<WineRegion> children() {
        return CHILDREN.getOrDefault(this, List.of());
    }

    /** 지원 국가 코드 목록 (선언 순서) */
    public static List<String> countryCodes() {
        return COUNTRY_CODES;
    }

    /** 이 산지가 해당 카테고리에서 쓰이는지 */
    public boolean supports(SpiritCategory category) {
        return category != null && categories.contains(category);
    }

    /** 카테고리별 지원 국가 코드 목록 (선언 순서) */
    public static List<String> countryCodes(SpiritCategory category) {
        if (category == null) {
            return COUNTRY_CODES;
        }
        return Arrays.stream(values())
                .filter(r -> r.isTopLevel() && r.supports(category))
                .map(WineRegion::getCountryCode)
                .distinct()
                .toList();
    }

    /** 국가별 L1 목록 (선언 순서) */
    public static List<WineRegion> topLevelsOf(String countryCode) {
        return TOP_LEVELS_BY_COUNTRY.getOrDefault(countryCode, List.of());
    }

    /** 국가·카테고리별 L1 목록 (선언 순서) */
    public static List<WineRegion> topLevelsOf(String countryCode, SpiritCategory category) {
        List<WineRegion> all = topLevelsOf(countryCode);
        if (category == null) {
            return all;
        }
        return all.stream().filter(r -> r.supports(category)).toList();
    }

    /** 전체 L1 목록 (선언 순서) */
    public static List<WineRegion> topLevels() {
        return Arrays.stream(values()).filter(WineRegion::isTopLevel).toList();
    }

    /** 알 수 없는 코드는 {@code Optional.empty()} — 예외를 던지지 않는다 */
    public static Optional<WineRegion> fromCode(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(WineRegion.valueOf(code.trim()));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
