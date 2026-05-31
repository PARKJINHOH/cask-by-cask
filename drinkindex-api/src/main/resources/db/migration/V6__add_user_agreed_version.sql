-- =============================================================================
-- users: 가입 시 동의한 약관/처리방침 버전 스냅샷 컬럼 추가
-- =============================================================================
-- 동의 시점의 활성 법적 문서 버전을 사용자 레코드에 보존(법적 증빙용).
-- local/dev 는 ddl-auto: update 가 컬럼을 자동 추가하지만, prod(ddl-auto: none)는
-- 본 마이그레이션으로 추가한다. (MariaDB 10.0.2+ 의 ADD COLUMN IF NOT EXISTS 사용)
-- =============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS terms_agreed_version   VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS privacy_agreed_version VARCHAR(50) NULL;
