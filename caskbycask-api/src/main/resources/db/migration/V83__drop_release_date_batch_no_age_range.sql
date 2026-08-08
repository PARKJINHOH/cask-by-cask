-- 출시일·배치 번호·숙성 연수 범위 컬럼 제거
--
-- 관리자 등록 폼에서 세 입력을 없애기로 하면서 저장 자리도 함께 정리한다.
-- 숙성 연수는 단일 값(age_statement / age_statement_months)만 남는다.
--   * age_statement_min / max 는 V13, *_months 는 V20 에서 추가됐다.
--   * release_date 는 V1 베이스라인, batch_no 도 V1 베이스라인.
--
-- 기존 값은 복구할 수 없다 — 제거 대상임을 확인하고 진행한다.

ALTER TABLE spirit_common_detail
    DROP COLUMN release_date,
    DROP COLUMN batch_no,
    DROP COLUMN age_statement_min,
    DROP COLUMN age_statement_min_months,
    DROP COLUMN age_statement_max,
    DROP COLUMN age_statement_max_months;
