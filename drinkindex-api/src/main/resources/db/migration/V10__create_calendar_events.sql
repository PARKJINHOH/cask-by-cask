-- =============================================================================
-- calendar_events: 이벤트 달력 (제품 출시일, 주류 페스티벌, 이벤트 기간 등)
-- =============================================================================
-- 관리자가 등록/관리하고 사용자는 조회만 한다.
-- end_date 가 NULL 이면 단일일(하루짜리) 이벤트, 값이 있으면 start_date~end_date 기간 이벤트.
-- category : RELEASE / FESTIVAL / EVENT / ETC (색상은 프론트에서 고정 매핑).
--
-- local/dev 는 ddl-auto: update 가 테이블을 자동 생성하지만, prod(ddl-auto: none)는
-- 본 마이그레이션으로 생성한다.
-- =============================================================================

CREATE TABLE IF NOT EXISTS calendar_events (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    title         VARCHAR(200) NOT NULL,
    description   TEXT         NULL,
    link_url      VARCHAR(500) NULL,
    category      VARCHAR(10)  NOT NULL,
    start_date    DATE         NOT NULL,
    end_date      DATE         NULL,
    is_visible    TINYINT(1)   NOT NULL DEFAULT 1,
    created_by_id BIGINT       NOT NULL,
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_calendar_event_created_by FOREIGN KEY (created_by_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_event_start_date ON calendar_events (start_date);
CREATE INDEX IF NOT EXISTS idx_event_end_date   ON calendar_events (end_date);
CREATE INDEX IF NOT EXISTS idx_event_is_visible ON calendar_events (is_visible);
