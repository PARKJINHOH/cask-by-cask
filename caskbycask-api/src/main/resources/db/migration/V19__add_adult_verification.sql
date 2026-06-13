-- 성인(연령) 인증 — 마이페이지 계정설정에서 자가 선언형(만 19세 이상) 인증.
-- method 컬럼은 추후 PASS(MOBILE)·소셜 로그인(SOCIAL) 연동 확장을 위한 enum.
-- 현재 정책상 재인증 없음 → adult_verify_expires_at 은 항상 NULL(추후 정책 활성화 대비 컬럼만 추가).

ALTER TABLE users ADD COLUMN adult_verified bit NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN adult_verified_at datetime NULL;
ALTER TABLE users ADD COLUMN adult_verify_method varchar(20) NULL;
ALTER TABLE users ADD COLUMN adult_birth_date date NULL;
ALTER TABLE users ADD COLUMN adult_verify_expires_at datetime NULL;
