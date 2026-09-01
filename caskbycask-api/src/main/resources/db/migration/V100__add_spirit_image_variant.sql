-- 이미지 ↔ 에디션 다중 지정.
-- 여러 에디션이 같은 라벨 디자인을 쓰는 일이 흔해, 에디션마다 같은 파일을 올리면
-- 디스크와 갤러리에 똑같은 이미지가 중복으로 쌓인다. 이미지는 마스터에 한 번만 올리고
-- 어느 에디션에 쓰이는지를 이 표로 연결한다.
--
-- FK 는 걸지 않는다(최근 마이그레이션과 동일). 정리는 서비스에서 명시적으로 한다 —
-- SpiritImageService.deleteImage / deleteImagesBySpiritId, SpiritService.permanentlyDeleteSpirit.
CREATE TABLE spirit_image_variant (
    id BIGINT NOT NULL AUTO_INCREMENT,
    spirit_image_id BIGINT NOT NULL COMMENT '이미지(spirit_image.id)',
    spirit_id BIGINT NOT NULL COMMENT '이 이미지를 쓰는 에디션(spirit.id)',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_spirit_image_variant UNIQUE (spirit_image_id, spirit_id),
    INDEX idx_spirit_image_variant_image (spirit_image_id),
    INDEX idx_spirit_image_variant_spirit (spirit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='이미지-에디션 지정';
