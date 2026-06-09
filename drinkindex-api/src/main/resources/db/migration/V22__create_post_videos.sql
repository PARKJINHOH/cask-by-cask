-- 게시글 업로드 동영상 테이블
CREATE TABLE post_videos (
    id                BIGINT         AUTO_INCREMENT PRIMARY KEY,
    post_id           BIGINT,
    original_file_name VARCHAR(255)  NOT NULL,
    saved_file_name   VARCHAR(255)   NOT NULL,
    file_size         BIGINT         NOT NULL,
    mime_type         VARCHAR(100)   NOT NULL,
    video_url         VARCHAR(500)   NOT NULL,
    sub_path          VARCHAR(200)   NOT NULL,
    is_used           BOOLEAN        NOT NULL DEFAULT FALSE,
    uploaded_by_id    BIGINT         NOT NULL,
    created_at        DATETIME(6)    NOT NULL,
    updated_at        DATETIME(6)    NOT NULL,
    CONSTRAINT fk_post_video_post FOREIGN KEY (post_id)        REFERENCES posts(id) ON DELETE SET NULL,
    CONSTRAINT fk_post_video_user FOREIGN KEY (uploaded_by_id) REFERENCES users(id)
);

CREATE INDEX idx_post_videos_post_id        ON post_videos (post_id);
CREATE INDEX idx_post_videos_saved_file_name ON post_videos (saved_file_name);
CREATE INDEX idx_post_videos_video_url       ON post_videos (video_url);
