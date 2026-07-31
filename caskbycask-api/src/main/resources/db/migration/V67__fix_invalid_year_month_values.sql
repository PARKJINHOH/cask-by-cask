-- =============================================================================
-- 증류·병입 연월의 잘못된 월 값 정리
-- =============================================================================
-- 검증 정규식이 `^\d{4}(-\d{2})?$` 였던 탓에 존재하지 않는 월(-00, -13 ~ -99)이
-- 통과해 저장될 수 있었다. 운영 데이터 점검 결과 1건이 발견되었다.
--   spirit_common_detail.spirit_id = 184 → distilled_date/bottled_date = '1993-30'
--
-- 정확한 월을 알 수 없으므로 **연도만 남긴다**(YYYY). 없는 정보를 추측해
-- 특정 월로 바꾸지 않는다. 연도는 그대로 보존되므로 정보 손실이 최소다.
--
-- 정규식은 애플리케이션 양쪽에서 월 01~12 만 허용하도록 함께 수정했다
-- (SpiritCommonDetailRequest · SpiritRegisterRequestBody · 프론트 DATE_RE / formatYearMonth).
-- =============================================================================

UPDATE spirit_common_detail
SET distilled_date = LEFT(distilled_date, 4)
WHERE distilled_date IS NOT NULL
  AND distilled_date <> ''
  AND distilled_date NOT REGEXP '^[0-9]{4}(-(0[1-9]|1[0-2]))?$'
  AND distilled_date REGEXP '^[0-9]{4}';

UPDATE spirit_common_detail
SET bottled_date = LEFT(bottled_date, 4)
WHERE bottled_date IS NOT NULL
  AND bottled_date <> ''
  AND bottled_date NOT REGEXP '^[0-9]{4}(-(0[1-9]|1[0-2]))?$'
  AND bottled_date REGEXP '^[0-9]{4}';

-- 연도조차 형식에 맞지 않는 값(예: 'unknown')은 남겨 두면 수정 화면에서 저장이 막힌다.
-- 그런 값은 위 조건에 걸리지 않으므로, 존재한다면 아래 조회로 확인해 개별 판단한다.
--   SELECT spirit_id, distilled_date, bottled_date FROM spirit_common_detail
--   WHERE (distilled_date IS NOT NULL AND distilled_date <> ''
--          AND distilled_date NOT REGEXP '^[0-9]{4}(-(0[1-9]|1[0-2]))?$')
--      OR (bottled_date   IS NOT NULL AND bottled_date   <> ''
--          AND bottled_date   NOT REGEXP '^[0-9]{4}(-(0[1-9]|1[0-2]))?$');
