-- 장소 유형 단순화 — BAR / BOTTLE_SHOP / OTHER 셋만 남긴다.
--
-- 왜 줄이는가:
--   MALT_BAR : 사용자가 "몰트바"와 "바"를 구분해 찾지 않는다. 필터가 둘로 갈리면
--              같은 곳을 찾는 사람이 두 칩을 번갈아 눌러야 하고, 등록하는 쪽도 매번 고민한다.
--              위스키 라인업이 주력이라는 사실은 유형이 아니라 이름·소개가 전달한다.
--   DUTY_FREE: 병을 사 가는 곳이라는 점에서 보틀샵과 하는 일이 같다. 면세 여부는
--              장소의 성격이 아니라 결제 조건이고, 그건 가격 트래커(stores)의 관심사다.
--
-- BOTTLE_SHOP 은 이름을 그대로 둔다 — 화면 라벨만 "리쿼샵"으로 바꾼다.
-- enum 값은 DB 에 저장되는 식별자이고 라벨은 표현이라, 표현이 바뀔 때마다 데이터를 옮기지 않는다.
UPDATE venue SET venue_type = 'BAR'         WHERE venue_type = 'MALT_BAR';
UPDATE venue SET venue_type = 'BOTTLE_SHOP' WHERE venue_type = 'DUTY_FREE';

-- 제보 요청은 폼 전체를 JSON 한 덩어리로 담고 있어 컬럼 UPDATE 로는 못 고친다.
-- 아직 처리되지 않은(PENDING) 요청만 문자열 치환한다 — 이미 승인·반려된 것은 이력이므로 손대지 않는다.
UPDATE venue_register_request
SET venue_data = REPLACE(venue_data, '"venueType":"MALT_BAR"', '"venueType":"BAR"')
WHERE status = 'PENDING' AND venue_data LIKE '%"venueType":"MALT_BAR"%';

UPDATE venue_register_request
SET venue_data = REPLACE(venue_data, '"venueType":"DUTY_FREE"', '"venueType":"BOTTLE_SHOP"')
WHERE status = 'PENDING' AND venue_data LIKE '%"venueType":"DUTY_FREE"%';
