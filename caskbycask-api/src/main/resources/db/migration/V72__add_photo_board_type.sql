-- =============================================================================
-- 게시판 유형에 PHOTO(이미지 갤러리) 추가
-- =============================================================================
-- 포토카드로 만든 사진을 올리는 이미지 갤러리를 신설한다.
-- 별도 도메인을 만들지 않고 기존 커뮤니티 게시판을 확장해 댓글·좋아요·스크랩·
-- 신고·욕설필터·알림·관리자 모더레이션을 그대로 재사용한다.
--
-- board_type 은 varchar 가 아니라 **MariaDB 네이티브 ENUM** 이다.
-- ALTER 없이 'PHOTO' 를 INSERT 하면 실패하므로 5개 테이블을 모두 확장해야 한다.
-- 값 추가만 하는 확장이라 기존 행에는 영향이 없다.
-- enum 값은 ddl-auto=validate 를 통과하도록 **알파벳 순서**로 정의한다
-- (PHOTO 가 마지막이라 MariaDB 가 데이터 재작성 없이 처리한다).
--
-- ※ "전체" 게시판 목록은 PostQueryRepositoryImpl 이 in(NOTICE, FREE) 화이트리스트로
--    조회하므로 PHOTO 글이 /community/all 에 섞이지 않는다.
-- =============================================================================

ALTER TABLE posts
    MODIFY COLUMN board_type enum ('FREE','NOTICE','PHOTO') not null comment '게시판 유형 — FREE/NOTICE/PHOTO';

ALTER TABLE deleted_posts
    MODIFY COLUMN board_type enum ('FREE','NOTICE','PHOTO') not null comment '게시판 유형 — FREE/NOTICE/PHOTO';

ALTER TABLE post_prefixes
    MODIFY COLUMN board_type enum ('FREE','NOTICE','PHOTO') not null comment '게시판 유형 — FREE/NOTICE/PHOTO';

ALTER TABLE series
    MODIFY COLUMN board_type enum ('FREE','NOTICE','PHOTO') not null comment '게시판 유형 — FREE/NOTICE/PHOTO';

-- 이 테이블만 nullable 이다(원본 DDL 확인 완료). NOT NULL 을 붙이면 기존 행이 깨진다.
ALTER TABLE user_board_permissions
    MODIFY COLUMN board_type enum ('FREE','NOTICE','PHOTO');
