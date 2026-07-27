create table review_images (
    id bigint not null auto_increment,
    review_id bigint null,
    variant_review_request_id bigint null,
    saved_file_name varchar(255) not null,
    sub_path varchar(255) not null,
    mime_type varchar(100) not null,
    image_url varchar(1000) not null,
    sort_order int not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_review_image_saved_file unique (saved_file_name),
    constraint ck_review_image_owner check (
        (review_id is not null and variant_review_request_id is null)
        or (review_id is null and variant_review_request_id is not null)
    ),
    constraint fk_review_image_review
        foreign key (review_id) references review (id),
    constraint fk_review_image_variant_request
        foreign key (variant_review_request_id) references spirit_variant_review_request (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index idx_review_image_review_order
    on review_images (review_id, sort_order, id);

create index idx_review_image_variant_order
    on review_images (variant_review_request_id, sort_order, id);

create table social_publish_bundle_media (
    id bigint not null auto_increment,
    bundle_id bigint not null,
    sort_order int not null,
    media_role varchar(30) not null,
    source_image_url varchar(1000) not null,
    rendered_image_url varchar(1000) null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_social_bundle_media_order unique (bundle_id, sort_order),
    constraint fk_social_bundle_media_bundle
        foreign key (bundle_id) references social_publish_bundles (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index idx_social_bundle_media_bundle
    on social_publish_bundle_media (bundle_id, sort_order, id);
