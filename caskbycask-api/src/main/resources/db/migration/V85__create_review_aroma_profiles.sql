create table review_aroma_profiles (
    id bigint not null auto_increment,
    review_id bigint null,
    variant_review_request_id bigint null,
    phase enum('FINISH','NOSE','PALATE') not null,
    schema_version int not null,
    primary key (id),
    constraint uk_review_aroma_profile_review_phase unique (review_id, phase),
    constraint uk_review_aroma_profile_request_phase unique (variant_review_request_id, phase),
    constraint chk_review_aroma_profile_owner check (
        (review_id is not null and variant_review_request_id is null)
        or (review_id is null and variant_review_request_id is not null)
    ),
    constraint fk_review_aroma_profile_review foreign key (review_id) references review (id) on delete cascade,
    constraint fk_review_aroma_profile_request foreign key (variant_review_request_id)
        references spirit_variant_review_request (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index idx_review_aroma_profile_review on review_aroma_profiles (review_id);
create index idx_review_aroma_profile_request on review_aroma_profiles (variant_review_request_id);

create table review_aroma_profile_items (
    id bigint not null auto_increment,
    profile_id bigint not null,
    aroma_type enum('CUSTOM','ID') not null,
    aroma_key varchar(255) not null,
    label_snapshot varchar(100) not null,
    intensity int not null,
    sort_order int not null,
    primary key (id),
    constraint uk_review_aroma_item_key unique (profile_id, aroma_type, aroma_key),
    constraint uk_review_aroma_item_order unique (profile_id, sort_order),
    constraint chk_review_aroma_item_intensity check (intensity between 1 and 5),
    constraint chk_review_aroma_item_order check (sort_order between 0 and 7),
    constraint fk_review_aroma_item_profile foreign key (profile_id)
        references review_aroma_profiles (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index idx_review_aroma_item_profile on review_aroma_profile_items (profile_id);
