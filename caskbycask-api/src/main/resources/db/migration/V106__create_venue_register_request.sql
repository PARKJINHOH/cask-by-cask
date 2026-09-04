-- 장소 제보 → 관리자 승인.
--
-- 생산자 등록 요청(producer_register_request)과 같은 설계다 — 제출 폼 전체를 JSON 한 덩어리로
-- 저장한다. 신청 표에 필드를 하나하나 두면 폼이 바뀔 때마다 마이그레이션이 따라오는데,
-- 승인되고 나면 진짜 표(venue)로 옮겨 가므로 신청 표에 정규화된 스키마가 필요하지 않다.
--
-- FK 는 걸지 않는다. 정리 책임: VenueRequestService (요청 자체는 이력이라 삭제하지 않는다).
CREATE TABLE venue_register_request (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '신청자(users.id)',
    venue_data TEXT NOT NULL COMMENT '신청 장소 데이터(JSON)',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '처리 상태 — PENDING/APPROVED/REJECTED',
    reject_reason TEXT NULL COMMENT '거절 사유',
    created_venue_id BIGINT NULL COMMENT '승인으로 만들어진 장소(venue.id)',
    reviewed_by_id BIGINT NULL COMMENT '처리한 관리자(users.id)',
    reviewed_at DATETIME(6) NULL COMMENT '처리 일시',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_venue_request_user (user_id, id),
    INDEX idx_venue_request_status (status, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='장소 등록 요청';
