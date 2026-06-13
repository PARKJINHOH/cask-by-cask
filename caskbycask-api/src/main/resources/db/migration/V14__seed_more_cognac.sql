-- =============================================================================
-- CaskByCask 기초데이터 — 꼬냑 하우스 추가분 (Cognac House seed, 보강)
-- =============================================================================
-- 작성 기준일: 2026-06-06
-- 범위: V4 누락 보강 — 대중/수출 메종 + 프레스티지 독립 메종 + 그랑드/프티트 샹파뉴 그로어.
--
-- [주의]
--   - Flyway 버전 마이그레이션입니다. 한 번 적용된 후에는 이 파일을 수정하지 마세요.
--   - producer.type 은 기본값이 없는 NOT NULL → INSERT 동안만 'COGNAC_HOUSE' 기본값을 지정.
--   - search_keywords(V9 추가)는 생략 → NULL.
--   - 중복 방지: V4 에 이미 있는 메종은 제외했습니다.
--   - 모든 생산자는 프랑스 꼬냑 지역 소재(country='프랑스'). 끄뤼는 description 에 보충.
-- =============================================================================
ALTER TABLE producer ALTER COLUMN type SET DEFAULT 'COGNAC_HOUSE';

INSERT INTO producer
    (name_ko, name_en, country, region, website, founded_year, description_ko, description_en, created_at, updated_at)
VALUES
('고데', 'Godet', '프랑스', '꼬냑', 'https://www.godet.fr', 1838,
 '라로셸에 본거지를 둔 역사적 가족 메종. 가문 내력은 16세기까지 거슬러 올라가며 섬세한 스타일로 유명하다.',
 'A historic family house based in La Rochelle, with roots tracing to the 16th century, known for its delicate style.',
 NOW(6), NOW(6)),
('라르센', 'Larsen', '프랑스', '꼬냑', 'https://www.larsencognac.com', 1926,
 '노르웨이 출신 옌스 라르센이 세운 메종. 바이킹 배 모양 보틀로 스칸디나비아·아시아에서 큰 인기를 누린다.',
 'A house founded by Norwegian-born Jens Reidar Larsen, hugely popular in Scandinavia and Asia for its Viking-ship bottles.',
 NOW(6), NOW(6)),
('바슈-가브리엘센', 'Bache-Gabrielsen', '프랑스', '꼬냑', 'https://www.bache-gabrielsen.com', 1905,
 '노르웨이계 가문이 세운 자르낙의 가족 메종. 보르드리 끄뤼 중심의 균형 잡힌 스타일로 정평이 나 있다.',
 'A Jarnac family house of Norwegian origin, esteemed for a balanced style centred on the Borderies cru.',
 NOW(6), NOW(6)),
('브라스타드 (티퐁)', 'Braastad (Tiffon)', '프랑스', '꼬냑', 'https://www.cognac-tiffon.com', 1875,
 '티퐁 메종이 운영하는 브랜드. 노르웨이계 브라스타드 가문이 이끌며 자체 포도밭과 숙성고를 갖췄다.',
 'A brand of the Tiffon house, led by the Norwegian-descended Braastad family, with its own vineyards and cellars.',
 NOW(6), NOW(6)),
('드 뤼즈', 'De Luze', '프랑스', '꼬냑', 'https://www.deluze.com', 1822,
 '보르도 무역에서 출발한 역사적 메종. 핀 샹파뉴 중심의 우아하고 향기로운 꼬냑으로 알려져 있다.',
 'A historic house with roots in the Bordeaux trade, known for elegant, aromatic Fine Champagne Cognac.',
 NOW(6), NOW(6)),
('막심 트리욜', 'Maxime Trijol', '프랑스', '꼬냑', 'https://www.maximetrijol.com', 1859,
 '대규모 증류 설비를 갖춘 가족 생산자. 자체 증류와 폭넓은 끄뤼로 다수 브랜드에 원액을 공급한다.',
 'A family producer with large distillation capacity, supplying spirit to many brands through its own stills and wide range of crus.',
 NOW(6), NOW(6)),
('크루아제', 'Croizet', '프랑스', '꼬냑', NULL, 1805,
 '그랑드 샹파뉴의 역사적 가족 메종. 희소한 빈티지 꼬냑으로 컬렉터들에게 잘 알려져 있다.',
 'A historic Grande Champagne family house, well known to collectors for its rare vintage Cognacs.',
 NOW(6), NOW(6)),
('샤토 드 몽티포', 'Château de Montifaud', '프랑스', '꼬냑', 'https://www.montifaud.com', 1866,
 '프티트 샹파뉴의 명문 그로어(발레 가문). 자체 재배·증류·숙성하는 싱글 이스테이트 꼬냑으로 애호가들의 사랑을 받는다.',
 'A renowned Petite Champagne grower (the Vallet family), beloved by enthusiasts for single-estate Cognac grown, distilled and aged in-house.',
 NOW(6), NOW(6)),
('폴 지로', 'Paul Giraud', '프랑스', '꼬냑', NULL, 1937,
 '부트빌의 그랑드 샹파뉴 그로어. 무가당·무착색에 가까운 순수하고 진한 싱글 끄뤼 꼬냑으로 유명하다.',
 'A Grande Champagne grower in Bouteville famed for pure, rich single-cru Cognac with little or no added sugar or colouring.',
 NOW(6), NOW(6)),
('발랭 테르시니에', 'Vallein Tercinier', '프랑스', '꼬냑', 'https://www.cognac-vallein-tercinier.com', 1850,
 '5대째 이어지는 그로어 가문. 내추럴(무가당·무착색) 스타일과 ''로트'' 표기 꼬냑으로 애호가들에게 큰 인기를 누린다.',
 'A fifth-generation grower family with a strong enthusiast following for its natural (no sugar or colouring) style and "Lot"-numbered Cognacs.',
 NOW(6), NOW(6)),
('그로스페랭', 'Grosperrin', '프랑스', '꼬냑', 'https://www.grosperrin.com', 1992,
 '오래된 빈티지·끄뤼 원액을 발굴·병입하는 것으로 유명한 전문 하우스. 희소한 고숙성 꼬냑으로 추앙받는다.',
 'A house famed for sourcing and bottling old vintage and single-cru eaux-de-vie, revered for rare extra-aged Cognacs.',
 NOW(6), NOW(6)),
('ABK6', 'ABK6', '프랑스', '꼬냑', 'https://www.abk6-cognac.com', 2010,
 '아베카시스 가문의 싱글 이스테이트 꼬냑 브랜드. 자체 포도밭에서 일관 생산하는 현대적 스타일로 인기를 얻고 있다.',
 'A single-estate Cognac brand of the Abécassis family, gaining popularity for a modern style produced end-to-end from its own vineyards.',
 NOW(6), NOW(6)),
('뒤도뇽', 'Dudognon', '프랑스', '꼬냑', NULL, 1776,
 '그랑드 샹파뉴의 전통 그로어 가문. 자체 재배·증류한 진하고 풍미 가득한 싱글 끄뤼 꼬냑으로 알려져 있다.',
 'A traditional Grande Champagne grower family, known for rich, full-flavoured single-cru Cognac grown and distilled in-house.',
 NOW(6), NOW(6)),
('오드리', 'Audry', '프랑스', '꼬냑', NULL, 1878,
 '소량 생산의 프레스티지 메종. 고숙성·빈티지 꼬냑과 정교한 디캔터로 애호가들에게 잘 알려져 있다.',
 'A small-production prestige house well known among connoisseurs for aged, vintage Cognacs and elegant decanters.',
 NOW(6), NOW(6)),
('도 (부아노)', 'Deau (Boinaud)', '프랑스', '꼬냑', 'https://www.cognac-deau.com', 1846,
 '꼬냑 최대급 자가 포도밭을 보유한 부아노 도멘의 브랜드. 싱글 이스테이트 기반의 안정적 품질로 유명하다.',
 'A brand of the Boinaud estate, holder of one of Cognac''s largest family-owned vineyards, known for consistent single-estate quality.',
 NOW(6), NOW(6)),
('장-뤽 파스케', 'Jean-Luc Pasquet', '프랑스', '꼬냑', 'https://www.jeanlucpasquet.com', 1730,
 '그랑드 샹파뉴의 유기농 그로어 가문. 무가당·무착색의 ''내추럴'' 빈티지 꼬냑으로 애호가들에게 추앙받는다.',
 'An organic Grande Champagne grower family revered by enthusiasts for its natural, no-sugar, no-colouring vintage Cognacs.',
 NOW(6), NOW(6));


ALTER TABLE producer ALTER COLUMN type DROP DEFAULT;
