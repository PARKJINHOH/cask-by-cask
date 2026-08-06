-- =============================================================================
-- 포토카드 템플릿
-- =============================================================================
-- 사진 위에 EXIF·주류 정보·증류소 로고를 배치하는 레이아웃을 저장한다.
--   · OFFICIAL — 관리자가 만든 공식 템플릿 (owner_user_id = null)
--   · USER     — 사용자가 만든 템플릿. 기본 비공개(is_public=0)이며
--                공개로 바꾸면 다른 사용자도 골라 쓸 수 있다.
--
-- 레이아웃은 taste_tree_versions.content_json 선례대로 LONGTEXT JSON 이다.
-- 요소 좌표·크기·글자 크기를 전부 **비율(0~1)** 로 담기 때문에 원본 사진 해상도가
-- 3000px 이든 1080px 이든 같은 템플릿이 동일하게 보인다.
-- schema_version 은 서버가 저장 직전에 강제로 채운다(클라이언트 값을 믿지 않는다).
--
-- 테이스팅 트리와 달리 draft/publish 개념이 없어 버전 테이블은 두지 않는다.
-- enum 값은 ddl-auto=validate 를 통과하도록 **알파벳 순서**로 정의한다.
-- =============================================================================

create table photo_card_templates (
    id bigint not null auto_increment comment 'PK',
    template_type enum ('OFFICIAL','USER') not null comment '템플릿 유형 — OFFICIAL/USER',
    owner_user_id bigint comment '소유자(users.id) — OFFICIAL 은 null',
    created_by_user_id bigint comment '생성자(users.id)',
    name varchar(60) not null comment '템플릿 이름',
    description varchar(200) comment '설명',
    aspect_ratio varchar(12) not null comment '이미지 비율 — 1:1/4:5/3:4/9:16/16:9',
    schema_version integer not null comment '레이아웃 스키마 버전',
    layout_json LONGTEXT not null comment '레이아웃 JSON',
    thumbnail_url varchar(500) comment '미리보기 이미지 URL',
    thumbnail_saved_file_name varchar(255) comment '미리보기 저장 파일명',
    thumbnail_sub_path varchar(200) comment '미리보기 저장 하위 경로',
    is_public bit not null comment '공개 여부 — 사용자 템플릿을 다른 사용자에게 개방',
    moderation_status enum ('HIDDEN','VISIBLE') not null comment '노출 상태 — 관리자 숨김용',
    display_order integer not null comment '정렬 순서',
    use_count bigint not null comment '사용 횟수',
    created_at datetime(6) not null comment '생성 일시',
    updated_at datetime(6) not null comment '수정 일시',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='포토카드 템플릿';

create index idx_photo_card_tpl_owner on photo_card_templates (owner_user_id, updated_at);
create index idx_photo_card_tpl_public on photo_card_templates (template_type, is_public, moderation_status, display_order);

alter table photo_card_templates
    add constraint fk_photo_card_tpl_owner foreign key (owner_user_id) references users (id) on delete cascade;
alter table photo_card_templates
    add constraint fk_photo_card_tpl_creator foreign key (created_by_user_id) references users (id) on delete set null;
