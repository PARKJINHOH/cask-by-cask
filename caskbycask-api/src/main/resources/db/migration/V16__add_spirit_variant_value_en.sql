-- 에디션 식별 값 (영문) 컬럼 추가
ALTER TABLE spirit
    ADD COLUMN variant_value_en VARCHAR(100) NULL COMMENT '에디션 식별 값 (영문)' AFTER variant_value;
