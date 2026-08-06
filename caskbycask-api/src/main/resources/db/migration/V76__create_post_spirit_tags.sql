-- =============================================================================
-- 게시글 주류 태그
-- =============================================================================
-- 이미지 갤러리(PHOTO) 게시글에 포토카드로 고른 주류를 태그로 붙인다.
-- 태그를 누르면 주류 상세로 이동하고, 주류 상세에서는 "이 술의 사진"을 모아 본다.
--
-- posts.spirit_id 단일 컬럼이 아니라 별도 테이블인 이유:
--   · 사진 한 장에 여러 병이 나오는 경우가 흔하다
--   · idx_post_spirit_by_spirit 이 "주류별 사진 모아보기"를 인덱스로 해결한다
--   · 본문 리치텍스트의 주류 카드 임베드(data-spirit-id)는 HTML 안이라 조회가 불가능하다
--
-- ※ Post 엔티티는 이 관계를 cascade=ALL + orphanRemoval 로 매핑해야 한다.
--    PostMoveService 가 게시글을 물리 삭제(postRepository.delete)하므로
--    cascade 가 없으면 **모든 게시판의 글 삭제가 FK 위반으로 실패**한다.
-- =============================================================================

create table post_spirit_tags (
    id bigint not null auto_increment comment 'PK',
    post_id bigint not null comment '게시글(posts.id)',
    spirit_id bigint not null comment '주류(spirit.id)',
    sort_order integer not null comment '정렬 순서',
    created_at datetime(6) not null comment '생성 일시',
    updated_at datetime(6) not null comment '수정 일시',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='게시글 주류 태그';

create unique index ux_post_spirit_tags_post_spirit on post_spirit_tags (post_id, spirit_id);
create index idx_post_spirit_tags_by_spirit on post_spirit_tags (spirit_id, post_id);

alter table post_spirit_tags
    add constraint fk_post_spirit_tags_post foreign key (post_id) references posts (id) on delete cascade;
alter table post_spirit_tags
    add constraint fk_post_spirit_tags_spirit foreign key (spirit_id) references spirit (id) on delete cascade;
