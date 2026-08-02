-- =============================================================================
-- 꼬냑 등급에 EXTRA 추가
-- =============================================================================
-- Extra 는 BNIC 이 최소 숙성연수를 정한 등급이 아니라 하우스가 XO 이상 프레스티지
-- 레인지에 붙이는 표기다(Rémy Martin Extra, Camus Extra, Frapin Extra 등).
-- 실제 유통되는 표기라서 기존 6개 등급만으로는 등록할 수 없었다.
--
-- 값 추가만 하는 확장이므로 기존 행·필터·검색에 영향이 없다.
-- enum 값은 ddl-auto=validate 를 통과하도록 **알파벳 순서**로 정의한다.
-- =============================================================================

ALTER TABLE spirit_cognac_detail
    MODIFY grade enum (
        'EXTRA',
        'HORS_DAGE',
        'NAPOLEON',
        'VS',
        'VSOP',
        'XO',
        'XXO'
    ) COMMENT '등급 — VS/VSOP/NAPOLEON/XO/XXO/EXTRA/HORS_DAGE';
