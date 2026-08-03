-- =============================================================================
-- 꼬냑 등급에 NO_STATEMENT(등급 미표기) 추가
-- =============================================================================
-- 라벨에 BNIC 등급 표기가 없는 큐베가 하나의 부류로 존재한다
-- (Rémy Martin 1738 Accord Royal, Martell Cordon Bleu, Hennessy Paradis, Louis XIII 등).
-- 등급을 필수로 두면서 이 값이 없으면 등록자가 등급을 지어내게 되므로 값으로 둔다.
--
-- null(아직 모름)과 구분된다 — NO_STATEMENT 는 "확인해 보니 표기가 없다"는 사실이다.
-- 위스키의 is_nas(숙성 연수 미표기)와 같은 성격.
--
-- 값 추가만 하는 확장이므로 기존 행·필터·검색에 영향이 없다.
-- enum 값은 ddl-auto=validate 를 통과하도록 **알파벳 순서**로 정의한다.
-- =============================================================================

ALTER TABLE spirit_cognac_detail
    MODIFY grade enum (
        'EXTRA',
        'HORS_DAGE',
        'NAPOLEON',
        'NO_STATEMENT',
        'VS',
        'VSOP',
        'XO',
        'XXO'
    ) COMMENT '등급 — VS/VSOP/NAPOLEON/XO/XXO/EXTRA/HORS_DAGE/NO_STATEMENT(미표기)';
