-- 와인 빈티지 수집 운영 이력 및 외부 출처 메타데이터.
-- 라이선스 승인 전 기본값은 자동화 OFF + FIXTURE 모드다.

alter table spirit
    add column source_provider varchar(30) null comment '외부 데이터 제공자',
    add column source_url varchar(1000) null comment '외부 원문 URL',
    add column source_image_url varchar(1000) null comment '이용 허가된 외부 대표 이미지 URL',
    add column source_rating decimal(3,2) null comment '외부 제공자 평점',
    add column source_rating_count integer null comment '외부 제공자 평점 참여 수';

alter table spirit
    modify column variant_type varchar(20) null
        comment '에디션 유형 (BATCH/RELEASE_YEAR/SINGLE_CASK/VINTAGE/NONE)';

create table wine_ingest_settings (
    id bigint not null,
    automation_enabled bit not null,
    provider_mode varchar(20) not null,
    license_approved bit not null,
    usage_grant_ref varchar(500) null,
    hourly_limit integer not null,
    max_run_items integer not null,
    slack_alert_enabled bit not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='와인 수집 설정';

insert into wine_ingest_settings
    (id, automation_enabled, provider_mode, license_approved, usage_grant_ref,
     hourly_limit, max_run_items, slack_alert_enabled, created_at, updated_at)
values (1, 0, 'FIXTURE', 0, null, 10, 3, 1, now(6), now(6));

create table wine_ingest_runs (
    id bigint not null auto_increment,
    run_key varchar(100) not null,
    run_type varchar(20) not null,
    status varchar(30) not null,
    requested_limit integer not null,
    attempted_count integer not null default 0,
    created_count integer not null default 0,
    duplicate_count integer not null default 0,
    skipped_count integer not null default 0,
    failed_count integer not null default 0,
    requested_by_id bigint null,
    error_message varchar(2000) null,
    started_at datetime(6) null,
    last_heartbeat_at datetime(6) null,
    finished_at datetime(6) null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_wine_ingest_run_key unique (run_key),
    constraint fk_wine_ingest_run_requested_by foreign key (requested_by_id) references users (id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='와인 수집 실행';

create index idx_wine_ingest_run_status_created on wine_ingest_runs (status, created_at);

create table wine_ingest_items (
    id bigint not null auto_increment,
    run_id bigint not null,
    status varchar(40) not null,
    provider varchar(30) not null,
    external_wine_id varchar(100) null,
    external_vintage_id varchar(100) null,
    source_url varchar(1000) null,
    wine_name_en varchar(200) null,
    wine_name_ko varchar(200) null,
    vintage_label varchar(20) null,
    reason_code varchar(60) null,
    reason_message varchar(2000) null,
    spirit_id bigint null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint fk_wine_ingest_item_run foreign key (run_id) references wine_ingest_runs (id) on delete cascade,
    constraint fk_wine_ingest_item_spirit foreign key (spirit_id) references spirit (id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='와인 수집 건별 결과';

create index idx_wine_ingest_item_run_status on wine_ingest_items (run_id, status);

create table spirit_external_references (
    id bigint not null auto_increment,
    spirit_id bigint not null,
    provider varchar(30) not null,
    external_wine_id varchar(100) not null,
    external_vintage_id varchar(100) not null,
    identity_key varchar(64) not null,
    source_url varchar(1000) not null,
    usage_grant_ref varchar(500) not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_spirit_external_provider_vintage unique (provider, external_wine_id, external_vintage_id),
    constraint uk_spirit_external_identity unique (identity_key),
    constraint fk_spirit_external_spirit foreign key (spirit_id) references spirit (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='주류 외부 제공자 식별자 및 이용 근거';

create index idx_spirit_external_spirit on spirit_external_references (spirit_id);
