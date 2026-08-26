-- 공개 주류 소개·리뷰의 Google 자동 번역 결과를 영구 캐시한다.
-- 원문이 바뀌면 source_hash 불일치로 재번역하고 동일 행을 교체한다.
CREATE TABLE content_translation_cache (
    id BIGINT NOT NULL AUTO_INCREMENT,
    resource_type ENUM('REVIEW','SPIRIT_NOTES') NOT NULL COMMENT 'SPIRIT_NOTES / REVIEW',
    resource_id BIGINT NOT NULL,
    target_language ENUM('EN','KO') NOT NULL COMMENT 'ko / en',
    source_hash CHAR(64) NOT NULL COMMENT '필드명+원문의 SHA-256',
    translated_fields LONGTEXT NOT NULL COMMENT '번역된 필드 JSON',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_translation_cache_resource_target
        UNIQUE (resource_type, resource_id, target_language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Google Cloud 월간 무료 구간을 넘기기 전에 차단하는 애플리케이션 측 원장.
-- 실패한 외부 호출도 되돌리지 않는 보수적 allocated_characters 값이다.
CREATE TABLE translation_monthly_usage (
    id BIGINT NOT NULL AUTO_INCREMENT,
    provider VARCHAR(30) NOT NULL,
    usage_month DATE NOT NULL COMMENT '미국 태평양 시간 기준 월의 첫날',
    allocated_characters BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_translation_usage_provider_month UNIQUE (provider, usage_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
