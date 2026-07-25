CREATE TABLE social_data_deletion_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    confirmation_code VARCHAR(32) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    completed_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_social_data_deletion_confirmation_code UNIQUE (confirmation_code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Meta 데이터 삭제 요청 처리 및 상태 조회 이력';

CREATE INDEX idx_social_data_deletion_platform_created
    ON social_data_deletion_requests (platform, created_at, id);
