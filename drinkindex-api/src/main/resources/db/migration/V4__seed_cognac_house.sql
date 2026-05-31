-- =============================================================================
-- DrinkIndex 기초데이터 — 꼬냑 하우스 / 메종 (Cognac House seed)
-- =============================================================================
-- 작성 기준일: 2026-05-30
-- 범위: 프랑스 꼬냑(Cognac) 지역의 주요 생산자
--       대형 메종(빅4 등) + 프레스티지 독립 메종 + 그랑드 샹파뉴 싱글 이스테이트(그로어)
--
-- [주의]
--   - Flyway 버전 마이그레이션입니다. 한 번 적용된 후에는 이 파일을 수정하지 마세요.
--     (체크섬 검증 실패로 기동이 막힙니다. 보정이 필요하면 V5__*.sql 로 추가하세요.)
--   - 테이블: cognac_house (winery 와 동일 컬럼 구조).
--   - region 은 꼬냑 내 끄뤼(Grande/Petite Champagne, Borderies 등) 또는 소재 마을(자르낙 등)을 표기.
--   - founded_year 는 메종 설립(또는 상호 등록) 연도 기준이며, 가문 내력이 더 오래된 경우 description 에 보충.
--   - website 가 확실치 않은 경우 추측 URL 대신 NULL 로 두었습니다.
--   - 모든 생산자는 프랑스 꼬냑 지역 소재(country='프랑스').
-- =============================================================================

INSERT INTO cognac_house
    (name_ko, name_en, country, region, website, founded_year, description_ko, description_en, created_at, updated_at)
VALUES
-- ===================== 대형 메종 (Major houses) =====================
('헤네시', 'Hennessy', '프랑스', '꼬냑', 'https://www.hennessy.com', 1765,
 '세계 최대의 꼬냑 메종. VSOP·XO 등급의 기준을 세웠으며 전 세계 꼬냑 판매의 큰 비중을 차지한다.',
 'The world''s largest Cognac house, which helped define the VSOP and XO grades and accounts for a large share of global Cognac sales.',
 NOW(6), NOW(6)),
('레미 마르탱', 'Rémy Martin', '프랑스', '꼬냑', 'https://www.remymartin.com', 1724,
 '그랑드/프티트 샹파뉴 끄뤼만 사용하는 ''핀 샹파뉴'' 꼬냑으로 유명한 메종. 켄타우로스 로고가 상징이다.',
 'A house famed for "Fine Champagne" Cognac sourced only from the Grande and Petite Champagne crus, symbolised by its centaur logo.',
 NOW(6), NOW(6)),
('마르텔', 'Martell', '프랑스', '꼬냑', 'https://www.martell.com', 1715,
 '현존하는 가장 오래된 대형 꼬냑 메종 중 하나. 부드럽고 우아한 스타일로 정평이 나 있다.',
 'One of the oldest of the great Cognac houses still operating, esteemed for its smooth, elegant style.',
 NOW(6), NOW(6)),
('쿠르부아지에', 'Courvoisier', '프랑스', '꼬냑 (자르낙)', 'https://www.courvoisier.com', 1809,
 '''나폴레옹의 꼬냑''으로 알려진 자르낙의 메종. 4대 메이저 꼬냑 하우스 중 하나다.',
 'A Jarnac house known as "the Cognac of Napoleon," one of the four major Cognac houses.',
 NOW(6), NOW(6)),
('카뮈', 'Camus', '프랑스', '꼬냑', 'https://www.camus.fr', 1863,
 '5대째 이어지는 세계 최대의 독립 가족 꼬냑 메종. 보르드리 끄뤼 중심의 향기로운 스타일이 특징이다.',
 'The largest independent family-owned Cognac house, in its fifth generation, known for an aromatic, Borderies-driven style.',
 NOW(6), NOW(6)),
('비스키', 'Bisquit & Dubouché', '프랑스', '꼬냑 (루야크)', NULL, 1819,
 '알렉상드르 비스키가 설립한 역사적 메종. 루야크의 대규모 증류소를 갖췄으며 현재 남아공 디스텔 그룹 소유다.',
 'A historic house founded by Alexandre Bisquit, with a large distillery at Rouillac, now owned by South Africa''s Distell group.',
 NOW(6), NOW(6)),
('루이 루아예', 'Louis Royer', '프랑스', '꼬냑 (자르낙)', 'https://www.louis-royer.com', 1853,
 '벌집 로고로 알려진 자르낙의 메종. 폭넓은 끄뤼의 균형 잡힌 블렌드로 유명하다.',
 'A Jarnac house known by its honeybee logo, recognised for balanced blends drawn from a wide range of crus.',
 NOW(6), NOW(6)),
('뫼코', 'Meukow', '프랑스', '꼬냑', 'https://www.meukow.com', 1862,
 '검은 표범 보틀로 유명한 메종. 본래 러시아 황실 공급을 위해 설립되었다.',
 'A house famous for its black panther bottle, originally established to supply the Russian Imperial court.',
 NOW(6), NOW(6)),
-- ===================== 프레스티지 독립 메종 (Prestige houses) =====================
('하인', 'Hine', '프랑스', '꼬냑 (자르낙)', 'https://www.hine.com', 1763,
 '자르낙의 명문 메종. 영국 왕실 납품 인증을 받았으며 우아하고 섬세한 ''얼리 랜디드'' 꼬냑으로 유명하다.',
 'A prestigious Jarnac house, holder of a British Royal Warrant, famed for its elegant, "Early Landed" Cognacs.',
 NOW(6), NOW(6)),
('바롱 오타르 (샤토 드 꼬냑)', 'Baron Otard (Château de Cognac)', '프랑스', '꼬냑', 'https://www.baronotard.com', 1795,
 '프랑수아 1세가 태어난 꼬냑 성(샤토 드 꼬냑)에서 숙성하는 역사적 메종.',
 'A historic house ageing its Cognac in the Château de Cognac, the castle where King François I was born.',
 NOW(6), NOW(6)),
('A. 아르디', 'A. Hardy', '프랑스', '꼬냑', 'https://www.cognac-hardy.com', 1863,
 '영국계 가문이 세운 독립 가족 메종. 고숙성·럭셔리 보틀(노아·페를르 등)로 유명하다.',
 'An independent family house of British origin, known for its aged, luxury decanters such as Noces and Perfection.',
 NOW(6), NOW(6)),
('고티에', 'Gautier', '프랑스', '꼬냑 (애즈)', NULL, 1755,
 '현존하는 가장 오래된 꼬냑 메종 중 하나. 18세기 왕실 인가를 받은 유서 깊은 생산자다.',
 'One of the oldest surviving Cognac houses, a heritage producer granted royal authorisation in the 18th century.',
 NOW(6), NOW(6)),
('메종 페랑 (피에르 페랑)', 'Maison Ferrand (Pierre Ferrand)', '프랑스', '꼬냑 (그랑드 샹파뉴)', 'https://www.cognacferrand.com', 1989,
 '알렉상드르 가브리엘이 부활시킨 그랑드 샹파뉴 메종. 페랑 가문 내력은 더 오래되었으며 장인적 꼬냑으로 정평이 나 있다.',
 'A Grande Champagne house revived by Alexandre Gabriel; the Ferrand family''s roots run deeper, and it is acclaimed for artisanal Cognac.',
 NOW(6), NOW(6)),
('파크', 'Park (Tessendier)', '프랑스', '꼬냑', 'https://www.cognacpark.com', 1880,
 '테센디에 가문이 운영하는 메종의 대표 브랜드. 정교한 블렌딩으로 국제 시장에서 호평받는다.',
 'The flagship brand of the Tessendier family''s house, well received internationally for its meticulous blending.',
 NOW(6), NOW(6)),
('테세롱', 'Tesseron', '프랑스', '꼬냑 (그랑드 샹파뉴)', NULL, 1905,
 '방대한 고숙성 원액 재고로 유명한 가족 메종. 빈티지·숙성 단계(로트) 표기 꼬냑으로 잘 알려져 있다.',
 'A family house famed for its vast stocks of very old eaux-de-vie, well known for its "Lot"-numbered, extra-aged Cognacs.',
 NOW(6), NOW(6)),
('프뤼니에', 'Prunier', '프랑스', '꼬냑', 'https://www.prunier-cognac.com', 1700,
 '1700년 기원을 주장하는 가장 오래된 꼬냑 무역 가문 중 하나. 고숙성·빈티지 꼬냑으로 정평이 나 있다.',
 'One of the oldest Cognac trading families, claiming origins in 1700, esteemed for its aged and vintage Cognacs.',
 NOW(6), NOW(6)),
('A. 드 퓌시니', 'A. de Fussigny', '프랑스', '꼬냑', NULL, 1814,
 '소규모 장인 메종으로, 끄뤼·빈티지를 강조한 개성 있는 꼬냑으로 애호가들에게 알려져 있다.',
 'A small artisanal house known among connoisseurs for characterful Cognacs emphasising specific crus and vintages.',
 NOW(6), NOW(6)),
-- ===================== 그랑드 샹파뉴 싱글 이스테이트 / 그로어 (Grower-producers) =====================
('프라팽', 'Frapin', '프랑스', '꼬냑 (그랑드 샹파뉴)', 'https://www.cognac-frapin.com', 1270,
 '그랑드 샹파뉴 단일 끄뤼의 자체 포도밭만 사용하는 ''싱글 에스테이트'' 꼬냑 명가. 가문 내력이 수백 년에 이른다.',
 'A "single estate" house using only its own Grande Champagne single-cru vineyards, with a family lineage stretching back centuries.',
 NOW(6), NOW(6)),
('들라맹', 'Delamain', '프랑스', '꼬냑 (그랑드 샹파뉴)', 'https://www.delamain-cognac.com', 1824,
 '그랑드 샹파뉴 고숙성 꼬냑만 전문으로 하는 소규모 명가. 섬세하고 드라이한 스타일로 추앙받는다.',
 'A small house specialising exclusively in aged Grande Champagne Cognac, revered for its delicate, dry style.',
 NOW(6), NOW(6)),
('라뇨 사부랭', 'Ragnaud-Sabourin', '프랑스', '꼬냑 (그랑드 샹파뉴)', NULL, 1850,
 '그랑드 샹파뉴의 명문 그로어 가문. 자체 재배·증류·숙성으로 만든 고품질 싱글 이스테이트 꼬냑으로 유명하다.',
 'A celebrated Grande Champagne grower family, renowned for high-quality single-estate Cognac grown, distilled and aged in-house.',
 NOW(6), NOW(6)),
('장 피유', 'Jean Fillioux', '프랑스', '꼬냑 (그랑드 샹파뉴)', 'https://www.jeanfillioux.com', 1880,
 '쥐야크르코크의 그랑드 샹파뉴 그로어. 단일 밭 ''라 푸야드'' 등 장인적 꼬냑으로 애호가들의 사랑을 받는다.',
 'A Grande Champagne grower in Juillac-le-Coq, beloved by enthusiasts for artisanal Cognacs such as its single-vineyard "La Pouyade".',
 NOW(6), NOW(6)),
('프랑수아 부아예', 'François Voyer', '프랑스', '꼬냑 (그랑드 샹파뉴)', 'https://www.francois-voyer.com', 1870,
 '그랑드 샹파뉴의 가족 경영 그로어. 순수하고 우아한 싱글 끄뤼 꼬냑으로 정평이 나 있다.',
 'A family-run Grande Champagne grower esteemed for its pure, elegant single-cru Cognacs.',
 NOW(6), NOW(6)),
('다니엘 부주', 'Daniel Bouju', '프랑스', '꼬냑 (그랑드 샹파뉴)', NULL, 1805,
 '그랑드 샹파뉴의 전통 그로어. 고도수·무가당·무착색의 내추럴한 스타일로 마니아층의 지지를 받는다.',
 'A traditional Grande Champagne grower with a cult following for its natural style — high proof, no added sugar or colouring.',
 NOW(6), NOW(6)),
('노르망댕 메르시에', 'Normandin-Mercier', '프랑스', '꼬냑 (프티트 샹파뉴)', 'https://www.normandin-mercier.com', 1872,
 '라로셸 인근에서 해양성 셀러 숙성을 하는 가족 메종. 프티트 샹파뉴 중심의 섬세한 꼬냑을 만든다.',
 'A family house ageing in maritime cellars near La Rochelle, producing delicate Cognac centred on Petite Champagne.',
 NOW(6), NOW(6)),
('레로 (르로)', 'Lhéraud', '프랑스', '꼬냑 (프티트 샹파뉴)', 'https://www.lheraud.com', 1680,
 '프티트 샹파뉴의 그로어 가문. 빈티지 꼬냑과 진하고 풍미 가득한 스타일로 잘 알려져 있다.',
 'A Petite Champagne grower family well known for vintage-dated Cognacs and a rich, full-flavoured style.',
 NOW(6), NOW(6));
