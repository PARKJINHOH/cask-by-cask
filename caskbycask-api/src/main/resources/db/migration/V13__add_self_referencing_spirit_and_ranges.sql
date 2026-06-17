-- 1. spirit 테이블 변경: 자가 참조 parent_id 및 variant 정보 추가
ALTER TABLE spirit
    ADD COLUMN parent_id BIGINT NULL COMMENT '마스터 주류 ID (parent_id)',
    ADD COLUMN variant_type VARCHAR(20) NULL COMMENT '에디션 유형 (BATCH/RELEASE_YEAR/SINGLE_CASK/NONE)',
    ADD COLUMN variant_value VARCHAR(100) NULL COMMENT '에디션 식별 값 (예: Batch 10)';

ALTER TABLE spirit
    ADD CONSTRAINT fk_spirit_parent
    FOREIGN KEY (parent_id) REFERENCES spirit (id) ON DELETE SET NULL;

ALTER TABLE spirit
    ADD INDEX idx_spirit_parent_id (parent_id);

-- 2. 도수(ABV) 범위 컬럼 추가 및 마이그레이션
ALTER TABLE spirit
    ADD COLUMN abv_min DECIMAL(4,1) NULL COMMENT '최소 도수(%)',
    ADD COLUMN abv_max DECIMAL(4,1) NULL COMMENT '최대 도수(%)';

UPDATE spirit SET abv_min = abv, abv_max = abv WHERE abv IS NOT NULL;

-- 3. 숙성년수(Age Statement) 범위 컬럼 추가 및 마이그레이션
ALTER TABLE spirit_common_detail
    ADD COLUMN age_statement_min INT NULL COMMENT '최소 숙성 연수(년)',
    ADD COLUMN age_statement_max INT NULL COMMENT '최대 숙성 연수(년)';

UPDATE spirit_common_detail SET age_statement_min = age_statement, age_statement_max = age_statement WHERE age_statement IS NOT NULL;

-- 4. 피트도(Phenol PPM) 범위 컬럼 추가 및 마이그레이션
ALTER TABLE spirit_whisky_detail
    ADD COLUMN phenol_ppm_min INT NULL COMMENT '최소 페놀 수치(ppm)',
    ADD COLUMN phenol_ppm_max INT NULL COMMENT '최대 페놀 수치(ppm)';

UPDATE spirit_whisky_detail SET phenol_ppm_min = phenol_ppm, phenol_ppm_max = phenol_ppm WHERE phenol_ppm IS NOT NULL;
