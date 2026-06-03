-- =============================================================================
-- 생산자 통합 1단계 — winery / cognac_house 를 distillery(type 컬럼)로 흡수
-- =============================================================================
-- 작성 기준일: 2026-06-02
-- 배경: distillery / winery / cognac_house 세 테이블이 컬럼 구조가 100% 동일했음.
--       생산자를 단일 개념으로 통합하기 위해 distillery 에 type 컬럼을 추가하고
--       winery·cognac_house 행을 이관한 뒤 두 테이블을 제거한다.
-- 비고: local/dev 는 ddl-auto 가 type 컬럼을 자동 추가할 수 있으나, prod(ddl-auto: none)는
--       본 마이그레이션으로 추가한다. (MariaDB 의 ADD COLUMN IF NOT EXISTS 사용)
-- =============================================================================

-- 1) distillery 에 생산자 타입 컬럼 추가 (기존 행은 DISTILLERY)
ALTER TABLE distillery
    ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'DISTILLERY';

-- 2) winery 행 이관 (type = WINERY)
INSERT INTO distillery
    (type, name_ko, name_en, country, region, website, founded_year, description_ko, description_en, created_at, updated_at)
SELECT 'WINERY', name_ko, name_en, country, region, website, founded_year, description_ko, description_en, created_at, updated_at
FROM winery;

-- 3) cognac_house 행 이관 (type = COGNAC_HOUSE)
INSERT INTO distillery
    (type, name_ko, name_en, country, region, website, founded_year, description_ko, description_en, created_at, updated_at)
SELECT 'COGNAC_HOUSE', name_ko, name_en, country, region, website, founded_year, description_ko, description_en, created_at, updated_at
FROM cognac_house;

-- 4) 통합 완료된 원본 테이블 제거
DROP TABLE IF EXISTS winery;
DROP TABLE IF EXISTS cognac_house;
