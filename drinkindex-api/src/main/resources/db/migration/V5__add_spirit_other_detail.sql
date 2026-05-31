-- =============================================================================
-- 기타(OTHER) 카테고리 전용 상세 테이블
-- =============================================================================
-- category=OTHER 인 술(럼/진/보드카/데킬라/리큐르/사케 등)의 세부 정보 저장.
-- whisky/wine/cognac 상세와 동일하게 spirit_id를 PK 겸 FK로 사용 (1:1, @MapsId).
-- =============================================================================

CREATE TABLE IF NOT EXISTS spirit_other_detail (
    spirit_id  BIGINT       NOT NULL,
    other_type VARCHAR(20)  NULL COMMENT 'RUM|GIN|VODKA|TEQUILA|MEZCAL|BRANDY|LIQUEUR|SAKE|SOJU|BAIJIU|ABSINTHE|BEER|OTHER',
    extra_data TEXT         NULL COMMENT 'JSON: mainIngredient, productionMethod, notes',
    PRIMARY KEY (spirit_id),
    CONSTRAINT fk_spirit_other_detail_spirit
        FOREIGN KEY (spirit_id) REFERENCES spirit (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
