-- =============================================================================
-- 포토카드 이미지 (템플릿 미리보기 · 이미지 레이어)
-- =============================================================================
-- LocalFileStorageService 가 만드는 URL 은 /api/photo-cards/images/{파일명} 이라
-- 연월 디렉토리(photo-cards/202608)가 URL 에 없다. 파일명만으로 실제 경로를 복원하려면
-- 저장 하위 경로를 어딘가에 적어 둬야 한다 — taste_tree_images 와 같은 이유·같은 구조다.
--
-- 고아 파일 정리를 위해 업로더와 업로드 시각도 남긴다.
-- =============================================================================

create table photo_card_images (
    id bigint not null auto_increment comment 'PK',
    saved_file_name varchar(255) not null comment '저장 파일명',
    sub_path varchar(200) not null comment '저장 하위 경로',
    mime_type varchar(100) not null comment 'MIME 타입',
    image_url varchar(500) not null comment '이미지 URL',
    original_file_name varchar(255) not null comment '원본 파일명',
    file_size bigint not null comment '파일 크기(byte)',
    uploaded_by_id bigint comment '업로더(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    updated_at datetime(6) not null comment '수정 일시',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='포토카드 이미지';

create unique index ux_photo_card_images_file on photo_card_images (saved_file_name);
create index idx_photo_card_images_uploader on photo_card_images (uploaded_by_id, created_at);

alter table photo_card_images
    add constraint fk_photo_card_images_uploader foreign key (uploaded_by_id) references users (id) on delete set null;
