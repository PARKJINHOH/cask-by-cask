-- =============================================================================
-- 포토카드 임시저장 (편집 중인 카드를 잠시 맡아 두는 곳)
-- =============================================================================
-- 커뮤니티 글쓰기의 content_draft 와 같은 자리지만, 담는 것이 다르다.
--   * content_json — 배치·사진 변형·촬영 정보·주류·직접 입력값을 한 덩어리로(클라이언트 직렬화)
--   * photo_*      — 편집 중인 원본 사진. 이것이 없으면 이어서 편집이 불가능하다.
--   * thumbnail_data_uri — 목록에서 어떤 카드인지 알아보는 용도. 작은 JPEG 를 data URI 로 담는다.
--     (파일로 두면 만료 정리에서 지울 대상이 하나 더 늘고, 목록마다 요청이 한 번 더 간다)
--
-- 원본 사진은 사용자의 사진첩이다 — 오래 들고 있을 것이 아니라서 expires_at 을 두고
-- PhotoCardDraftCleanupBatch 가 지운다(보관 2주). 사용자 삭제·계정 삭제로도 함께 사라진다.
-- =============================================================================

create table photo_card_drafts (
    id bigint not null auto_increment comment 'PK',
    user_id bigint not null comment '작성자(users.id)',
    name varchar(100) comment '임시저장 이름(목록 표시용)',
    content_json mediumtext not null comment '편집 내용(JSON)',
    thumbnail_data_uri mediumtext comment '목록 미리보기(data URI)',
    photo_saved_file_name varchar(255) comment '사진 저장 파일명',
    photo_sub_path varchar(200) comment '사진 저장 하위 경로',
    photo_mime_type varchar(100) comment '사진 MIME 타입',
    expires_at datetime(6) not null comment '보관 만료 일시',
    created_at datetime(6) not null comment '생성 일시',
    updated_at datetime(6) not null comment '수정 일시',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='포토카드 임시저장';

create index idx_photo_card_drafts_user on photo_card_drafts (user_id, updated_at);
create index idx_photo_card_drafts_expires on photo_card_drafts (expires_at);

alter table photo_card_drafts
    add constraint fk_photo_card_drafts_user foreign key (user_id) references users (id) on delete cascade;
