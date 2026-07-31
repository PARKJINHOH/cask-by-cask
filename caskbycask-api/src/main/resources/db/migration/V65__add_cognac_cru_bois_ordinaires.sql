-- =============================================================================
-- 꼬냑 크뤼에 법정 6번째 구역 BOIS_ORDINAIRES 추가
-- =============================================================================
-- 꼬냑 AOC 의 법정 크뤼는 6개(Grande Champagne / Petite Champagne / Borderies /
-- Fins Bois / Bons Bois / Bois Ordinaires)인데 그동안 5개만 정의되어 있었다.
-- Bois Ordinaires 는 'Bois à Terroirs' 로도 표기되는 가장 외곽 구역이다.
--
-- 값 추가만 하는 확장이므로 기존 행·필터·검색에 영향이 없다.
-- enum 값은 ddl-auto=validate 를 통과하도록 **알파벳 순서**로 정의한다.
-- =============================================================================

ALTER TABLE spirit_cognac_detail
    MODIFY cru enum (
        'BOIS_ORDINAIRES',
        'BONS_BOIS',
        'BORDERIES',
        'FINS_BOIS',
        'GRANDE_CHAMPAGNE',
        'PETITE_CHAMPAGNE'
    ) COMMENT '크뤼(원산지) — 꼬냑 AOC 법정 6개 구역';
