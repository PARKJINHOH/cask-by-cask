-- =============================================================================
-- 가격 트래커 (Price Tracker) 스키마 — STEP 45~50
-- =============================================================================
-- 테이블: stores, store_aliases, price_reports, price_report_images,
--         price_discount_items, price_report_reports, price_alerts
--
-- 컨벤션(베이스라인과 동일):
--   - InnoDB / utf8mb4 / DATETIME(6) / TINYINT(1) bool
--   - FK 제약은 두지 않고(엔티티가 @JoinColumn만 사용) 인덱스로만 관리
--   - CREATE TABLE IF NOT EXISTS — ddl-auto:create 부트스트랩 후 baseline 한 환경에서도
--     중복 생성 에러 없이 통과하도록 방어적으로 작성
-- 참조 테이블명: 회원=users, 주류=spirit (단수)
-- =============================================================================

-- ── 매장 ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    display_name     VARCHAR(255) NOT NULL,
    store_type       VARCHAR(20)  NOT NULL COMMENT 'DOMESTIC|DUTYFREE',
    dutyfree_channel VARCHAR(20)  NULL COMMENT 'AIRPORT|CITY|INFLIGHT|ONLINE',
    region           VARCHAR(100) NULL,
    is_approved      TINYINT(1)   NOT NULL DEFAULT 0,
    created_by_id    BIGINT       NULL,
    approved_by_id   BIGINT       NULL,
    approved_at      DATETIME(6)  NULL,
    deleted_at       DATETIME(6)  NULL,
    created_at       DATETIME(6)  NOT NULL,
    updated_at       DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_store_display_name (display_name),
    INDEX idx_store_is_approved  (is_approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 매장 별칭 ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_aliases (
    id       BIGINT       NOT NULL AUTO_INCREMENT,
    store_id BIGINT       NOT NULL,
    alias    VARCHAR(200) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_store_alias_alias (alias),
    INDEX idx_store_alias_store (store_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 가격 등록 ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_reports (
    id                         BIGINT        NOT NULL AUTO_INCREMENT,
    spirit_id                  BIGINT        NOT NULL,
    store_id                   BIGINT        NULL,
    reporter_id                BIGINT        NULL,
    status                     VARCHAR(20)   NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING|APPROVED|REJECTED',
    currency                   VARCHAR(10)   NOT NULL COMMENT 'KRW|USD',
    price                      DECIMAL(12,0) NULL COMMENT '정가',
    sale_price                 DECIMAL(12,0) NULL COMMENT '행사가/면세 기본가',
    payback_amount             DECIMAL(12,0) NULL COMMENT '페이백',
    actual_price               DECIMAL(12,0) NULL COMMENT '실구매가/체감가 (계산 후 저장)',
    exchange_rate_snapshot     DECIMAL(10,4) NULL COMMENT '면세 USD 등록 시 환율 스냅샷',
    purchased_at               DATE          NULL,
    description                VARCHAR(500)  NULL,
    suggested_store_name       VARCHAR(255)  NULL COMMENT '자동완성에 없는 매장명 직접 입력',
    suggested_dutyfree_channel VARCHAR(20)   NULL COMMENT '면세 매장 제안 시 채널',
    is_anonymous               TINYINT(1)    NOT NULL DEFAULT 0,
    auto_flagged               TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '±30% 이상 차이 시 자동 플래그',
    is_verified                TINYINT(1)    NOT NULL DEFAULT 0,
    report_count               INT           NOT NULL DEFAULT 0,
    approved_by_id             BIGINT        NULL,
    approved_at                DATETIME(6)   NULL,
    reject_reason              VARCHAR(500)  NULL,
    rejected_at                DATETIME(6)   NULL,
    deleted_at                 DATETIME(6)   NULL,
    created_at                 DATETIME(6)   NOT NULL,
    updated_at                 DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_price_report_spirit_status_purchased (spirit_id, status, purchased_at),
    INDEX idx_price_report_store (store_id),
    INDEX idx_price_report_reporter (reporter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 인증 사진 ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_report_images (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    price_report_id    BIGINT       NULL COMMENT '업로드 직후 null → 등록 시 연결',
    uploaded_by_id     BIGINT       NOT NULL,
    original_file_name VARCHAR(255) NULL,
    saved_file_name    VARCHAR(255) NOT NULL,
    sub_path           VARCHAR(100) NOT NULL,
    mime_type          VARCHAR(50)  NOT NULL,
    image_url          VARCHAR(500) NOT NULL,
    sort_order         INT          NOT NULL DEFAULT 0,
    is_public          TINYINT(1)   NOT NULL DEFAULT 1,
    created_at         DATETIME(6)  NOT NULL,
    updated_at         DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_price_report_image_report (price_report_id),
    INDEX idx_price_report_image_uploader (uploaded_by_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 면세 할인 항목 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_discount_items (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    price_report_id BIGINT        NOT NULL,
    discount_type   VARCHAR(20)   NOT NULL COMMENT 'PAYMENT|BUNDLE|COUPON|OTHER',
    discount_amount DECIMAL(12,0) NOT NULL,
    description     VARCHAR(200)  NULL,
    PRIMARY KEY (id),
    INDEX idx_price_discount_item_report (price_report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 가격 등록 신고 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_report_reports (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    price_report_id BIGINT       NOT NULL,
    reporter_id     BIGINT       NOT NULL,
    reason          VARCHAR(30)  NOT NULL COMMENT 'FALSE_PRICE|DUPLICATE|BAD_IMAGE|OTHER',
    reason_detail   VARCHAR(500) NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING|RESOLVED|DISMISSED',
    resolved_at     DATETIME(6)  NULL,
    resolved_by_id  BIGINT       NULL,
    created_at      DATETIME(6)  NOT NULL,
    updated_at      DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_price_report_report_user (price_report_id, reporter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 목표가 알림 ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_alerts (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    user_id          BIGINT        NOT NULL,
    spirit_id        BIGINT        NOT NULL,
    target_price_krw DECIMAL(12,0) NULL COMMENT '면세 제외 KRW 목표가',
    is_active        TINYINT(1)    NOT NULL DEFAULT 1,
    last_notified_at DATETIME(6)   NULL,
    created_at       DATETIME(6)   NOT NULL,
    updated_at       DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_price_alert_user_spirit (user_id, spirit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 1;
