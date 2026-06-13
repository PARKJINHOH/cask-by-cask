-- 게시글 성인 전용 플래그 — 주류 나눔 등 만 19세 이상 전용 글.
-- true면 작성·수정·열람에 성인인증 필요(서비스 레이어 검증) + 목록/상세 제목에 19 아이콘 표시.

ALTER TABLE posts ADD COLUMN adult_only bit NOT NULL DEFAULT 0;
