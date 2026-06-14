-- 게시판별 공지(고정글) 기능
-- 전체 공지사항(notice)과 별개로, 각 커뮤니티 게시판(소식/자유) 및 BYOB 안에서만 상단 고정.
-- 관리자/파트너만 설정 가능(서비스 레이어 검증).

ALTER TABLE posts ADD COLUMN is_pinned bit NOT NULL DEFAULT 0 COMMENT '게시판 공지(상단 고정) 여부';
CREATE INDEX idx_post_board_pinned ON posts (board_type, is_pinned);

ALTER TABLE byobs ADD COLUMN is_pinned bit NOT NULL DEFAULT 0 COMMENT 'BYOB 공지(상단 고정) 여부';
CREATE INDEX idx_byob_pinned ON byobs (is_pinned);
