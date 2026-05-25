-- =============================================================================
-- DrinkIndex 초기 스키마 베이스라인
-- =============================================================================
-- 이 파일은 placeholder입니다. 실제 스키마는 Hibernate가 생성한 것을 사용합니다.
--
-- [운영 첫 배포 절차]
--   1. 빈 prod DB에 임시로 ddl-auto: create로 한 번 기동 → 스키마 자동 생성
--   2. 기동 종료 후 application-prod.yml의 ddl-auto: none 으로 되돌림
--   3. Flyway가 baseline-on-migrate: true 설정으로 현재 상태를 V0(baseline)으로 마킹
--   4. 이후 모든 스키마 변경은 V2__*.sql, V3__*.sql 형태로 추가
--
-- [대안 절차 — 권장]
--   1. 로컬/dev 환경에서 ddl-auto: create로 동작한 DB에서 스키마 dump:
--        mysqldump --no-data --skip-comments drinkindex_dev > V1__init_baseline.sql
--   2. dump 결과를 이 파일에 붙여넣기 (현재 placeholder 라인 제거)
--   3. 운영 환경 새로 띄울 때 Flyway가 V1을 실행하여 스키마 생성
--
-- 어느 방식이든 한 번 적용 후에는 이 파일을 수정하지 마세요.
-- Flyway는 적용된 마이그레이션의 체크섬을 검증하므로 변경 시 기동 실패합니다.
-- =============================================================================

CREATE TABLE IF NOT EXISTS faqs (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    language   VARCHAR(5)   NOT NULL COMMENT 'KO|EN',
    category   VARCHAR(20)  NOT NULL COMMENT 'SERVICE|WHISKY|COGNAC|WINE',
    question   VARCHAR(500) NOT NULL,
    answer     TEXT         NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,
    created_at DATETIME(6)  NOT NULL,
    updated_at DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_faq_language  (language),
    INDEX idx_faq_category  (category),
    INDEX idx_faq_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 1;
