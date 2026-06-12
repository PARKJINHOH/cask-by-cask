-- 위스키 숙성/캐스크 모델 개편:
--   단일 주 캐스크(cask_type) + 숙성방식(maturation_style) + 피니시 캐스크(finish_cask_type)
--   → 복수 선택 캐스크 목록(extra_data.caskTypes) + 직접입력(extra_data.caskTypeOther) 으로 통합.
-- 캐스크 목록/직접입력은 extra_data(JSON TEXT)에 저장되므로 별도 컬럼 추가 없이 아래 3개 컬럼만 제거한다.
-- (주류 데이터는 출시 전 시드가 없어 기존 값 마이그레이션 불필요.)
ALTER TABLE spirit_whisky_detail
    DROP COLUMN cask_type,
    DROP COLUMN maturation_style,
    DROP COLUMN finish_cask_type;
