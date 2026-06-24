-- 배너 위치(MAIN/SIDE) 지정을 위한 컬럼 및 인덱스 추가
ALTER TABLE banners ADD COLUMN position VARCHAR(10) NOT NULL DEFAULT 'MAIN' COMMENT '배너 위치 — MAIN/SIDE';
CREATE INDEX idx_banner_position ON banners (position);
