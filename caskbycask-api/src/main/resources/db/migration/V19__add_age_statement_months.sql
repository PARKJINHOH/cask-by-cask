-- 숙성 연수에 '개월'(0~11) 입력을 지원하기 위한 컬럼 추가.
-- 단일 숙성 연수(age_statement)의 추가 개월. 범위(min/max)에는 적용하지 않음.

ALTER TABLE spirit_common_detail
    ADD COLUMN age_statement_months INT NULL COMMENT '숙성 개월(0~11) — 단일 연수의 추가 개월' AFTER age_statement;
