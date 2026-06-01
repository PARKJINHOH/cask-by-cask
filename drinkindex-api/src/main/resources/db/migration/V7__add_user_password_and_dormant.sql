-- =============================================================================
-- users: 비밀번호 변경 정책 + 휴면 계정 정책 컬럼 추가
-- =============================================================================
-- password_changed_at : 마지막 비밀번호 변경 시각 (90일 변경 권고 정책 기준)
-- last_login_at        : 마지막 로그인 시각 (365일 미접속 시 휴면 전환 기준)
-- dormant / dormant_at : 휴면 계정 여부 및 전환 시각
--
-- local/dev 는 ddl-auto: update 가 컬럼을 자동 추가하지만, prod(ddl-auto: none)는
-- 본 마이그레이션으로 추가한다. (MariaDB 10.0.2+ 의 ADD COLUMN IF NOT EXISTS 사용)
-- =============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_changed_at DATETIME(6) NULL,
    ADD COLUMN IF NOT EXISTS last_login_at       DATETIME(6) NULL,
    ADD COLUMN IF NOT EXISTS dormant             TINYINT(1)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dormant_at          DATETIME(6) NULL;

-- 기존 계정은 가입일을 비밀번호 최초 설정 시각으로 간주 (NULL 인 경우만)
UPDATE users SET password_changed_at = created_at WHERE password_changed_at IS NULL;
