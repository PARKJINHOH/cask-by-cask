create table tier_lists (
    id bigint not null auto_increment,
    user_id bigint not null,
    title varchar(100) not null,
    description varchar(1000) null,
    share_key varchar(64) not null,
    revision int not null default 0,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create unique index ux_tier_lists_share_key
    on tier_lists (share_key);

create index idx_tier_lists_user_updated
    on tier_lists (user_id, updated_at);

alter table tier_lists
    add constraint fk_tier_lists_user
        foreign key (user_id) references users (id);

create table tier_list_rows (
    id bigint not null auto_increment,
    tier_list_id bigint not null,
    label varchar(50) not null,
    color varchar(20) not null,
    sort_order int not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index idx_tier_list_rows_list_sort
    on tier_list_rows (tier_list_id, sort_order);

alter table tier_list_rows
    add constraint fk_tier_list_rows_list
        foreign key (tier_list_id) references tier_lists (id)
        on delete cascade;

create table tier_list_items (
    id bigint not null auto_increment,
    tier_list_id bigint not null,
    tier_row_id bigint null,
    item_type varchar(20) not null,
    spirit_id bigint null,
    producer_id bigint null,
    display_name varchar(200) not null,
    image_url varchar(500) null,
    sort_order int not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index idx_tier_list_items_list_sort
    on tier_list_items (tier_list_id, sort_order);

create index idx_tier_list_items_row_sort
    on tier_list_items (tier_row_id, sort_order);

create index idx_tier_list_items_spirit
    on tier_list_items (spirit_id);

create index idx_tier_list_items_producer
    on tier_list_items (producer_id);

alter table tier_list_items
    add constraint fk_tier_list_items_list
        foreign key (tier_list_id) references tier_lists (id)
        on delete cascade;

alter table tier_list_items
    add constraint fk_tier_list_items_row
        foreign key (tier_row_id) references tier_list_rows (id)
        on delete set null;

alter table tier_list_items
    add constraint fk_tier_list_items_spirit
        foreign key (spirit_id) references spirit (id)
        on delete set null;

alter table tier_list_items
    add constraint fk_tier_list_items_producer
        foreign key (producer_id) references producer (id)
        on delete set null;

create table tier_list_images (
    id bigint not null auto_increment,
    uploaded_by_id bigint not null,
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

create unique index ux_tier_list_images_saved_file
    on tier_list_images (saved_file_name);

create index idx_tier_list_images_uploader
    on tier_list_images (uploaded_by_id);

alter table tier_list_images
    add constraint fk_tier_list_images_uploader
        foreign key (uploaded_by_id) references users (id);
