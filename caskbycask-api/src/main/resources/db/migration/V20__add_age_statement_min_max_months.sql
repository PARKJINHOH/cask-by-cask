-- 숙성 연수 범위(min/max) 지정 시에도 '개월'(0~11) 입력을 지원하기 위한 컬럼 추가.

ALTER TABLE spirit_common_detail
    ADD COLUMN age_statement_min_months INT NULL COMMENT '범위 최소 숙성 개월(0~11)' AFTER age_statement_min,
    ADD COLUMN age_statement_max_months INT NULL COMMENT '범위 최대 숙성 개월(0~11)' AFTER age_statement_max;
