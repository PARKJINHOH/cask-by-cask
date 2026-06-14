-- 커뮤니티 게시판 댓글 비밀댓글 기능
-- 작성자 본인 + 게시글 작성자 + 최고관리자(SUPER_ADMIN)만 내용 열람 가능. 그 외에는 마스킹 처리(서비스 레이어).

ALTER TABLE post_comments ADD COLUMN is_secret bit NOT NULL DEFAULT 0 COMMENT '비밀 댓글 여부';
