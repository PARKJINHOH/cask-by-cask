-- 하위 에디션 표시 순서 컬럼 추가.
-- 마스터 주류 화면에서 관리자가 지정한 에디션 목록 순서를 보존하기 위함.
-- 마스터/일반 술은 null, 하위 에디션은 0부터 시작하는 순번.

ALTER TABLE spirit
    ADD COLUMN display_order INT NULL COMMENT '하위 에디션 표시 순서 (마스터 기준 0부터)' AFTER variant_value_en;
