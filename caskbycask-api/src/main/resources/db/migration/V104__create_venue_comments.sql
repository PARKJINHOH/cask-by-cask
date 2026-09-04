-- 장소 방문 후기 댓글 + 사진(최대 5장).
--
-- 별도 표를 만드는 이유 — 이 저장소의 어떤 댓글 표도 이미지를 지원하지 않는다.
-- community_comment(주류 댓글) 를 본떠 스레드·신고·소프트삭제 구조를 맞추고,
-- 이미지는 review_images 의 검증·교체 규약을 따르는 자식 표로 분리한다.
--
-- FK 는 걸지 않는다(V100 이후 규약). 정리 책임:
--   VenueCommentService.delete       — 댓글 삭제 시 이미지 행·파일
--   VenueAdminService.delete         — 장소 삭제 시 댓글·이미지 전부
CREATE TABLE venue_comments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    venue_id BIGINT NOT NULL COMMENT '장소(venue.id)',
    user_id BIGINT NOT NULL COMMENT '작성자(users.id)',
    parent_id BIGINT NULL COMMENT '부모 댓글(venue_comments.id) — 1단 대댓글만 허용',
    content TEXT NOT NULL COMMENT '본문(평문). 서식 없는 텍스트로만 저장한다',
    like_count INT NOT NULL DEFAULT 0 COMMENT '좋아요 수',
    is_hidden TINYINT(1) NOT NULL DEFAULT 0 COMMENT '신고 누적 자동 숨김 여부',
    report_count INT NOT NULL DEFAULT 0 COMMENT '신고 수',
    deleted_at DATETIME(6) NULL COMMENT '소프트 삭제 시각',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_venue_comment_venue (venue_id, deleted_at, id),
    INDEX idx_venue_comment_parent (parent_id),
    INDEX idx_venue_comment_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='장소 댓글';

-- 이미지는 업로드 시 전부 WebP 로 재인코딩된다 — 원본을 남기지 않는 것은 용량 때문이 아니라
-- EXIF 때문이다. 바 사진에는 촬영 위치가 박혀 있어 원본을 그대로 서빙하면
-- 사용자의 이동 이력이 새어 나간다. "원본 보관으로 최적화"하려는 시도를 막기 위해 여기 적어 둔다.
CREATE TABLE venue_comment_images (
    id BIGINT NOT NULL AUTO_INCREMENT,
    venue_comment_id BIGINT NOT NULL COMMENT '댓글(venue_comments.id)',
    saved_file_name VARCHAR(255) NOT NULL COMMENT '저장 파일명(UUID.webp)',
    sub_path VARCHAR(100) NOT NULL COMMENT '저장 하위 경로(venues/yyyyMM)',
    mime_type VARCHAR(50) NOT NULL COMMENT 'MIME 타입',
    image_url VARCHAR(500) NOT NULL COMMENT '서빙 URL',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '노출 순서(0부터)',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_venue_comment_image_file UNIQUE (saved_file_name),
    INDEX idx_venue_comment_image_comment (venue_comment_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='장소 댓글 이미지';
