-- 와인 산지 코드 (WineRegion enum name) — 산지 지도 표시용
-- region(한글 지역명 텍스트) 컬럼은 그대로 유지한다. 기존 지역 필터·검색·SEO 가 region 을 사용하므로
-- region_code 는 병행 추가하고, region_code 가 지정되면 서비스가 region 을 L1 산지명으로 동기화한다.
ALTER TABLE spirit
    ADD COLUMN region_code VARCHAR(40) NULL COMMENT '와인 산지 코드(WineRegion) — 지도 표시용' AFTER region;

CREATE INDEX idx_spirit_region_code ON spirit (region_code);
