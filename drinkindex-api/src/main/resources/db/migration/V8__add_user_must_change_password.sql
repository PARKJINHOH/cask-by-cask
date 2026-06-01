-- =============================================================================
-- users: 임시 비밀번호 발급 후 즉시 변경 강제 플래그 추가
-- =============================================================================
-- must_change_password : 임시 비밀번호로 로그인한 경우 비밀번호 변경 전까지 강제.
--
-- local/dev 는 ddl-auto: update 가 컬럼을 자동 추가하지만, prod(ddl-auto: none)는
-- 본 마이그레이션으로 추가한다. (MariaDB 10.0.2+ 의 ADD COLUMN IF NOT EXISTS 사용)
-- =============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) NOT NULL DEFAULT 0;
