-- =============================================================================
-- CaskByCask 기초데이터 — 와이너리 추가분 (Winery seed, 보강)
-- =============================================================================
-- 작성 기준일: 2026-06-06
-- 범위: V3 에서 누락된 산지·스타일 보강.
--       조지아(카헤티)·스페인(후미야/리아스 바이사스)·뉴질랜드(마틴버러)·
--       이탈리아(프란차코르타/소아베/에트나)·나파 컬트·루아르·프로방스·보졸레 등.
--
-- [주의]
--   - Flyway 버전 마이그레이션입니다. 한 번 적용된 후에는 이 파일을 수정하지 마세요.
--   - producer.type 은 기본값이 없는 NOT NULL → INSERT 동안만 'WINERY' 기본값을 지정.
--   - search_keywords(V9 추가)는 생략 → NULL.
--   - 중복 방지: V3 에 이미 있는 생산자는 제외했습니다.
-- =============================================================================
ALTER TABLE producer ALTER COLUMN type SET DEFAULT 'WINERY';

INSERT INTO producer
    (name_ko, name_en, country, region, website, founded_year, description_ko, description_en, created_at, updated_at)
VALUES
-- ===================== 조지아 — 카헤티 (Kakheti) =====================
('킨즈마라울리 마라니', 'Kindzmarauli Marani', '조지아', '카헤티', NULL, 2003,
 '사페라비로 만드는 세미스위트 레드 ''킨즈마라울리''로 유명한 카헤티의 대형 와이너리.',
 'A large Kakheti winery known for "Kindzmarauli," a semi-sweet red made from the native Saperavi grape.',
 NOW(6), NOW(6)),
('파전츠 티어스', 'Pheasant''s Tears', '조지아', '카헤티', NULL, 2007,
 '토착 품종과 전통 크베브리(토기) 양조를 고집하는 내추럴·앰버 와인의 선구 와이너리.',
 'A pioneer of natural and amber wine, committed to native varieties and traditional qvevri (clay-vessel) winemaking.',
 NOW(6), NOW(6)),
('텔라비 와인 셀러 (마라니)', 'Telavi Wine Cellar (Marani)', '조지아', '카헤티', 'https://www.marani.co', 1915,
 '카헤티의 역사적 대형 와이너리. ''마라니'' 브랜드로 사페라비·므츠바네 등 토착 품종 와인을 만든다.',
 'A historic large Kakheti winery producing native-variety wines such as Saperavi and Mtsvane under the "Marani" brand.',
 NOW(6), NOW(6)),
-- ===================== 스페인 — 후미야 / 리아스 바이사스 / 카스티야 =====================
('핀카 바카라', 'Finca Bacara', '스페인', '후미야', 'https://www.fincabacara.com', 2003,
 '올드 바인 모나스트렐(무르베드르)로 진한 레드를 만드는 후미야의 와이너리. 해골 보틀 시리즈로도 알려져 있다.',
 'A Jumilla winery making bold reds from old-vine Monastrell (Mourvèdre), also known for its distinctive skull-bottle range.',
 NOW(6), NOW(6)),
('보데가스 후안 힐', 'Bodegas Juan Gil', '스페인', '후미야', 'https://www.juangil.es', 1916,
 '4대째 이어지는 후미야의 명가. 고지대 올드 바인 모나스트렐의 대표 생산자다.',
 'A fourth-generation Jumilla house, a leading producer of high-altitude old-vine Monastrell.',
 NOW(6), NOW(6)),
('마르틴 코닥스', 'Martín Códax', '스페인', '리아스 바이사스', 'https://www.martincodax.com', 1986,
 '알바리뇨 화이트로 유명한 리아스 바이사스의 대표 와이너리(협동조합 출발).',
 'A leading Rías Baixas winery (originally a cooperative) famed for its Albariño whites.',
 NOW(6), NOW(6)),
('보데가스 마우로', 'Bodegas Mauro', '스페인', '카스티야 이 레온', 'https://www.bodegasmauro.com', 1980,
 '베가 시실리아 출신 양조가 마리아노 가르시아가 설립한 명가. 템프라니요 중심의 응축된 레드로 정평이 나 있다.',
 'An estate founded by Mariano García, formerly of Vega Sicilia, esteemed for concentrated Tempranillo-based reds.',
 NOW(6), NOW(6)),
-- ===================== 뉴질랜드 — 마틴버러 (Martinborough) =====================
('마틴버러 빈야드', 'Martinborough Vineyard', '뉴질랜드', '마틴버러', 'https://www.martinborough-vineyard.co.nz', 1980,
 '마틴버러 피노 누아를 개척한 와이너리 중 하나. 우아하고 향기로운 스타일로 명성이 높다.',
 'One of the pioneers of Martinborough Pinot Noir, renowned for an elegant, perfumed style.',
 NOW(6), NOW(6)),
('아타 랑이', 'Ata Rangi', '뉴질랜드', '마틴버러', 'https://www.atarangi.co.nz', 1980,
 '마틴버러 피노 누아를 세계에 알린 명가. 단일 와인 ''아타 랑이 피노 누아''로 추앙받는다.',
 'An estate that brought Martinborough Pinot Noir to the world, revered for its flagship "Ata Rangi Pinot Noir".',
 NOW(6), NOW(6)),
('드라이 리버', 'Dry River', '뉴질랜드', '마틴버러', NULL, 1979,
 '장기 숙성형 피노 누아와 게뷔르츠트라미너로 컬트적 인기를 누리는 마틴버러의 소규모 와이너리.',
 'A small Martinborough winery with a cult following for age-worthy Pinot Noir and Gewürztraminer.',
 NOW(6), NOW(6)),
-- ===================== 이탈리아 — 프란차코르타 / 소아베 / 에트나 / 피에몬테 =====================
('카 델 보스코', 'Ca'' del Bosco', '이탈리아', '롬바르디아 (프란차코르타)', 'https://www.cadelbosco.com', 1968,
 '이탈리아 전통 방식 스파클링 ''프란차코르타''를 대표하는 명가.',
 'A leading estate of "Franciacorta," Italy''s traditional-method sparkling wine.',
 NOW(6), NOW(6)),
('벨라비스타', 'Bellavista', '이탈리아', '롬바르디아 (프란차코르타)', 'https://www.bellavistawine.it', 1977,
 '프란차코르타를 대표하는 또 하나의 명가. 정교하고 우아한 스파클링으로 유명하다.',
 'Another flagship Franciacorta house, renowned for refined, elegant sparkling wines.',
 NOW(6), NOW(6)),
('피에로판', 'Pieropan', '이탈리아', '베네토 (소아베)', 'https://www.pieropan.it', 1880,
 '소아베 클라시코의 기준을 세운 역사적 가족 와이너리. 단일 밭 화이트로 유명하다.',
 'A historic family winery that set the standard for Soave Classico, famed for its single-vineyard whites.',
 NOW(6), NOW(6)),
('베난티', 'Benanti', '이탈리아', '시칠리아 (에트나)', 'https://www.benanti.it', 1988,
 '에트나 화산 토착 품종(네렐로 마스칼레세·카리칸테)의 부흥을 이끈 대표 와이너리.',
 'A leading winery that drove the revival of Mount Etna''s native varieties (Nerello Mascalese and Carricante).',
 NOW(6), NOW(6)),
('엘리오 알타레', 'Elio Altare', '이탈리아', '피에몬테', NULL, 1948,
 '바리크·짧은 침용 등 바롤로 현대주의를 이끈 혁신가의 와이너리. 라 모라의 명가로 꼽힌다.',
 'The estate of an innovator who led modernist Barolo (barrique ageing, short macerations), a leading house of La Morra.',
 NOW(6), NOW(6)),
-- ===================== 미국 — 나파/캘리포니아 컬트 =====================
('콜긴 셀러스', 'Colgin Cellars', '미국', '나파 밸리', 'https://www.colgincellars.com', 1992,
 '나파 컬트 카베르네의 정점 중 하나. 극소량 회원제 판매로 세계 최고가 신대륙 와인에 속한다.',
 'One of the pinnacles of Napa cult Cabernet; tiny mailing-list production places it among the priciest New World wines.',
 NOW(6), NOW(6)),
('슈레이더 셀러스', 'Schrader Cellars', '미국', '나파 밸리 (오크빌)', 'https://www.schradercellars.com', 1998,
 '투 칼론 밭 단일 카베르네로 만점 평점을 다수 받은 오크빌의 컬트 와이너리.',
 'An Oakville cult winery with multiple perfect scores for its single-vineyard To Kalon Cabernet.',
 NOW(6), NOW(6)),
('케이크브레드 셀러스', 'Cakebread Cellars', '미국', '나파 밸리 (러더퍼드)', 'https://www.cakebread.com', 1973,
 '가족 경영 나파 명가. 안정적 품질의 샤르도네와 카베르네 소비뇽으로 사랑받는다.',
 'A family-run Napa estate beloved for consistently styled Chardonnay and Cabernet Sauvignon.',
 NOW(6), NOW(6)),
('시네 쿼 논', 'Sine Qua Non', '미국', '캘리포니아', NULL, 1994,
 '매 빈티지 이름과 라벨 아트가 바뀌는 론풍(시라·그르나슈) 컬트 와이너리. 극도의 희소성으로 유명하다.',
 'A Rhône-style (Syrah, Grenache) cult winery that changes its wine names and label art every vintage, famed for extreme scarcity.',
 NOW(6), NOW(6)),
-- ===================== 프랑스 — 보졸레 / 루아르 / 프로방스 / 론 =====================
('마르셀 라피에르', 'Marcel Lapierre', '프랑스', '보졸레', NULL, 1973,
 '내추럴 와인 운동을 이끈 모르공의 전설적 가메 생산자. 무첨가·자연 발효 스타일로 추앙받는다.',
 'A legendary Morgon producer of Gamay who led the natural wine movement, revered for additive-free, naturally fermented wines.',
 NOW(6), NOW(6)),
('도멘 위에', 'Domaine Huet', '프랑스', '루아르 (부브레)', 'https://www.huet-echansonne.com', 1928,
 '부브레 슈냉 블랑(드라이~귀부)의 기준을 세운 바이오다이내믹 명가.',
 'A biodynamic benchmark for Vouvray Chenin Blanc, spanning dry to nobly sweet styles.',
 NOW(6), NOW(6)),
('도멘 텅피에', 'Domaine Tempier', '프랑스', '프로방스 (방돌)', 'https://www.domainetempier.com', 1834,
 '무르베드르 기반 방돌 로제·레드의 상징적 도멘. 프로방스 로제의 진지한 표본으로 꼽힌다.',
 'An iconic Bandol domaine of Mourvèdre-based rosé and red, considered a serious benchmark for Provence rosé.',
 NOW(6), NOW(6)),
('도멘 장 루이 샤브', 'Domaine Jean-Louis Chave', '프랑스', '론 (에르미타주)', NULL, 1481,
 '16대를 이어온 에르미타주의 정점. 시라 레드와 마르산·루산 화이트로 북부 론의 기준을 세웠다.',
 'A 16-generation pinnacle of Hermitage, setting the Northern Rhône standard with its Syrah reds and Marsanne–Roussanne whites.',
 NOW(6), NOW(6)),
-- ===================== 포르투갈 / 호주 / 그리스 / 오스트리아 / 독일 / 우루과이 =====================
('키타 두 크라스토', 'Quinta do Crasto', '포르투갈', '도루', 'https://www.quintadocrasto.pt', 1615,
 '도루 강을 굽어보는 역사적 싱글 킨타. 도루 스틸 와인과 포트를 모두 아우르는 명가다.',
 'A historic single quinta overlooking the Douro, acclaimed for both Douro still wines and Port.',
 NOW(6), NOW(6)),
('클로날킬라', 'Clonakilla', '호주', '캔버라', 'https://www.clonakilla.com.au', 1971,
 '시라즈·비오니에 코페르멘테이션(공동 발효)의 선구자. 캔버라 디스트릭트의 컬트 와이너리다.',
 'A pioneer of Shiraz–Viognier co-fermentation, a cult winery of the Canberra District.',
 NOW(6), NOW(6)),
('그로세트', 'Grosset', '호주', '사우스오스트레일리아 (클레어 밸리)', 'https://www.grosset.com.au', 1981,
 '클레어 밸리 리슬링의 정점으로 꼽히는 와이너리. 단일 밭 ''폴리시 힐''로 유명하다.',
 'A winery regarded as the pinnacle of Clare Valley Riesling, famed for its single-vineyard "Polish Hill".',
 NOW(6), NOW(6)),
('키르 야니', 'Kir-Yianni', '그리스', '나우사', 'https://www.kiryianni.gr', 1997,
 '북부 그리스 토착 품종 시노마브로의 대표 생산자. 나우사·아민데오에 포도밭을 두고 있다.',
 'A leading producer of the northern Greek native variety Xinomavro, with vineyards in Naoussa and Amyndeon.',
 NOW(6), NOW(6)),
('도멘 바하우', 'Domäne Wachau', '오스트리아', '바하우', 'https://www.domaene-wachau.at', 1938,
 '바하우 그뤼너 펠트리너·리슬링의 대형 협동조합 명가. 단일 밭 와인의 높은 품질로 정평이 나 있다.',
 'A large Wachau cooperative esteemed for high-quality single-vineyard Grüner Veltliner and Riesling.',
 NOW(6), NOW(6)),
('베른하르트 후버', 'Bernhard Huber', '독일', '바덴', 'https://www.weingut-huber.com', 1987,
 '독일 슈페트부르군더(피노 누아)를 부르고뉴 수준으로 끌어올린 바덴의 정상급 에스테이트.',
 'A top Baden estate that elevated German Spätburgunder (Pinot Noir) to Burgundian heights.',
 NOW(6), NOW(6)),
('보데가 가르손', 'Bodega Garzón', '우루과이', '마이도나도', 'https://www.bodegagarzon.com', 2008,
 '대서양의 영향을 받는 우루과이의 현대적 대형 에스테이트. 토착적 강점인 타나와 알바리뇨로 주목받는다.',
 'A modern large Atlantic-influenced Uruguayan estate, noted for its signature Tannat and Albariño.',
 NOW(6), NOW(6));


ALTER TABLE producer ALTER COLUMN type DROP DEFAULT;
