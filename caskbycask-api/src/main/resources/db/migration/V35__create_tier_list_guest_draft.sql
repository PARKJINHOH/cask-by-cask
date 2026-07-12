create table tier_list_guest_drafts (
    id bigint not null auto_increment,
    token_hash char(64) not null,
    content_json mediumtext not null,
    expires_at datetime(6) not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create unique index ux_tier_list_guest_drafts_token
    on tier_list_guest_drafts (token_hash);

create index idx_tier_list_guest_drafts_expires
    on tier_list_guest_drafts (expires_at);

create table tier_list_guest_draft_images (
    id bigint not null auto_increment,
    draft_id bigint not null,
    original_file_name varchar(255) null,
    saved_file_name varchar(255) not null,
    file_size bigint not null,
    mime_type varchar(100) not null,
    image_url varchar(500) not null,
    sub_path varchar(200) not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create unique index ux_tier_list_guest_draft_images_saved_file
    on tier_list_guest_draft_images (saved_file_name);

create index idx_tier_list_guest_draft_images_draft
    on tier_list_guest_draft_images (draft_id);

alter table tier_list_guest_draft_images
    add constraint fk_tier_list_guest_draft_images_draft
        foreign key (draft_id) references tier_list_guest_drafts (id)
        on delete cascade;
