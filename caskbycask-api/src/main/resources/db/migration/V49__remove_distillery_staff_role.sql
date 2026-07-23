-- DISTILLERY_STAFF 역할을 동일한 생산자 범위 역할인 PARTNER로 통합한다.
--
-- V1의 users.role은 ENUM이지만 V10은 VARCHAR(20)이라고 가정했기 때문에,
-- 먼저 VARCHAR로 정규화해 기존 운영 DB와 신규 DB 모두에서 안전하게 이관한다.
ALTER TABLE users
    MODIFY COLUMN role VARCHAR(20) NOT NULL
    COMMENT '권한 — SUPER_ADMIN/ADMIN/MODERATOR/PARTNER/IMPORTER/MEMBER';

UPDATE users
SET role = 'PARTNER'
WHERE role = 'DISTILLERY_STAFF';
