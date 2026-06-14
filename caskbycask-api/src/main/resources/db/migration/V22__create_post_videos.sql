-- 게시글 업로드 동영상 테이블
CREATE TABLE post_videos (
    id                BIGINT         AUTO_INCREMENT PRIMARY KEY COMMENT 'PK',
    post_id           BIGINT         COMMENT '게시글(posts.id)',
    original_file_name VARCHAR(255)  NOT NULL COMMENT '원본 파일명',
    saved_file_name   VARCHAR(255)   NOT NULL COMMENT '저장 파일명',
    file_size         BIGINT         NOT NULL COMMENT '파일 크기(byte)',
    mime_type         VARCHAR(100)   NOT NULL COMMENT 'MIME 타입',
    video_url         VARCHAR(500)   NOT NULL COMMENT '동영상 URL',
    sub_path          VARCHAR(200)   NOT NULL COMMENT '저장 하위 경로',
    is_used           BOOLEAN        NOT NULL DEFAULT FALSE COMMENT '사용 중 여부',
    uploaded_by_id    BIGINT         NOT NULL COMMENT '업로더(users.id)',
    created_at        DATETIME(6)    NOT NULL COMMENT '생성 일시',
    updated_at        DATETIME(6)    NOT NULL COMMENT '수정 일시',
    CONSTRAINT fk_post_video_post FOREIGN KEY (post_id)        REFERENCES posts(id) ON DELETE SET NULL,
    CONSTRAINT fk_post_video_user FOREIGN KEY (uploaded_by_id) REFERENCES users(id)
) COMMENT='게시글 동영상';

CREATE INDEX idx_post_videos_post_id        ON post_videos (post_id);
CREATE INDEX idx_post_videos_saved_file_name ON post_videos (saved_file_name);
CREATE INDEX idx_post_videos_video_url       ON post_videos (video_url);
