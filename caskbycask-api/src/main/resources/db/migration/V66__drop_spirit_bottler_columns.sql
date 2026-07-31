-- =============================================================================
-- 미사용 컬럼 제거 — spirit.bottler(병입업체) · spirit.bottled_year(병입 연도)
-- =============================================================================
-- 운영 데이터 확인 결과 두 컬럼 모두 사용 건수 0 이었다.
--   SELECT COUNT(*), SUM(bottler IS NOT NULL AND TRIM(bottler) <> ''),
--          SUM(bottled_year IS NOT NULL) FROM spirit;  →  381 / 0 / 0
--
-- 병입 정보는 공통 상세의 bottled_date(병입 연월)로 대체된다.
-- 등록 요청(spirit_register_request.spirit_data)에 남아 있는 옛 JSON 키는
-- Spring 관리 ObjectMapper 가 미지의 속성을 무시하므로 그대로 역직렬화된다.
--
-- ※ DROP COLUMN 은 되돌릴 수 없다. 위 조회로 0건을 확인한 뒤에만 적용한다.
-- =============================================================================

ALTER TABLE spirit
    DROP COLUMN bottler,
    DROP COLUMN bottled_year;
