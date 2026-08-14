-- 생산자 로고를 단일 URL 3컬럼에서 최대 5장 목록(자식 테이블)으로 확장한다.
-- review_images 와 같은 구조(정렬 가능한 자식 테이블)를 따른다.

CREATE TABLE IF NOT EXISTS producer_logo_images (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    producer_id     BIGINT       NOT NULL,
    saved_file_name VARCHAR(255) NOT NULL,
    sub_path        VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    image_url       VARCHAR(1000) NOT NULL,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      DATETIME(6)  NOT NULL,
    updated_at      DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_producer_logo_image_saved_file UNIQUE (saved_file_name),
    CONSTRAINT fk_producer_logo_image_producer
        FOREIGN KEY (producer_id) REFERENCES producer (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_producer_logo_image_producer_order
    ON producer_logo_images (producer_id, sort_order, id);

-- 기존 단일 로고를 대표(0번, sort_order=0)로 이전한다.
-- mime_type 컬럼이 구 producer 테이블엔 없었으므로 저장 파일 확장자로 추정한다
-- (로고 업로드는 항상 WebP 무손실 변환을 거치므로 대부분 .webp 다).
INSERT INTO producer_logo_images
    (producer_id, saved_file_name, sub_path, mime_type, image_url, sort_order, created_at, updated_at)
SELECT
    p.id,
    p.logo_saved_file_name,
    p.logo_sub_path,
    CASE
        WHEN p.logo_saved_file_name LIKE '%.webp' THEN 'image/webp'
        WHEN p.logo_saved_file_name LIKE '%.png'  THEN 'image/png'
        WHEN p.logo_saved_file_name LIKE '%.gif'  THEN 'image/gif'
        ELSE 'image/jpeg'
    END,
    p.logo_image_url,
    0,
    NOW(6),
    NOW(6)
FROM producer p
WHERE p.logo_image_url IS NOT NULL
  AND p.logo_saved_file_name IS NOT NULL
  AND p.logo_sub_path IS NOT NULL;

ALTER TABLE producer
    DROP COLUMN logo_image_url,
    DROP COLUMN logo_saved_file_name,
    DROP COLUMN logo_sub_path;
