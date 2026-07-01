create table spirit_variant_review_request (
    id bigint not null auto_increment,
    master_spirit_id bigint not null,
    request_user_id bigint not null,
    linked_variant_id bigint null,
    review_id bigint null,
    reviewed_by_id bigint null,
    variant_type varchar(20) not null,
    variant_value varchar(100) not null,
    variant_value_en varchar(100) null,
    series_identifier varchar(100) null,
    series_identifier_en varchar(100) null,
    abv decimal(4,1) not null,
    volume_ml int not null,
    request_memo varchar(500) null,
    nose_score decimal(4,1) not null,
    taste_score decimal(4,1) not null,
    finish_score decimal(4,1) not null,
    total_score decimal(4,1) not null,
    nose_note varchar(300) null,
    taste_note varchar(300) null,
    finish_note varchar(300) null,
    comment varchar(500) null,
    nose_aroma_wheel_notes varchar(800) null,
    taste_aroma_wheel_notes varchar(800) null,
    finish_aroma_wheel_notes varchar(800) null,
    status varchar(20) not null,
    reviewed_at datetime(6) null,
    reject_reason varchar(500) null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index idx_variant_review_request_master
    on spirit_variant_review_request (master_spirit_id);

create index idx_variant_review_request_user
    on spirit_variant_review_request (request_user_id);

create index idx_variant_review_request_status
    on spirit_variant_review_request (status);

create index idx_variant_review_request_created
    on spirit_variant_review_request (created_at);

create index idx_variant_review_request_value
    on spirit_variant_review_request (master_spirit_id, variant_value);

alter table spirit_variant_review_request
    add constraint fk_variant_review_request_master
        foreign key (master_spirit_id) references spirit (id);

alter table spirit_variant_review_request
    add constraint fk_variant_review_request_user
        foreign key (request_user_id) references users (id);

alter table spirit_variant_review_request
    add constraint fk_variant_review_request_linked_variant
        foreign key (linked_variant_id) references spirit (id);

alter table spirit_variant_review_request
    add constraint fk_variant_review_request_review
        foreign key (review_id) references review (id);

alter table spirit_variant_review_request
    add constraint fk_variant_review_request_reviewer
        foreign key (reviewed_by_id) references users (id);
