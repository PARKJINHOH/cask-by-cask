create table social_thumbnail_templates (
    id bigint not null auto_increment,
    name varchar(100) not null,
    background_image_url varchar(1000) not null,
    active bit not null default 1,
    display_order int not null default 0,
    created_by_id bigint not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint fk_social_template_created_by foreign key (created_by_id) references users (id)
);

create index idx_social_template_active_order
    on social_thumbnail_templates (active, display_order, id);

create table social_publish_bundles (
    id bigint not null auto_increment,
    origin_type varchar(30) not null,
    origin_id bigint not null,
    content_type varchar(30) null,
    content_id bigint null,
    requested_by_id bigint null,
    locale varchar(5) not null default 'ko',
    consent_version varchar(30) not null,
    consented_at datetime(6) not null,
    media_mode varchar(30) not null,
    thumbnail_template_id bigint null,
    thumbnail_text varchar(200) null,
    direct_image_url varchar(1000) null,
    rendered_image_url varchar(1000) null,
    short_code varchar(16) not null,
    source_deleted bit not null default 0,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_social_bundle_short_code unique (short_code),
    constraint fk_social_bundle_requested_by foreign key (requested_by_id) references users (id),
    constraint fk_social_bundle_template foreign key (thumbnail_template_id) references social_thumbnail_templates (id)
);

create index idx_social_bundle_origin
    on social_publish_bundles (origin_type, origin_id);
create index idx_social_bundle_content
    on social_publish_bundles (content_type, content_id);
create index idx_social_bundle_requested
    on social_publish_bundles (requested_by_id, created_at);

create table social_publications (
    id bigint not null auto_increment,
    bundle_id bigint not null,
    platform varchar(20) not null,
    status varchar(30) not null,
    container_id varchar(255) null,
    external_media_id varchar(255) null,
    permalink varchar(1000) null,
    caption_snapshot longtext null,
    image_url_snapshot varchar(1000) null,
    attempt_count int not null default 0,
    next_attempt_at datetime(6) null,
    last_attempt_at datetime(6) null,
    published_at datetime(6) null,
    last_error_code varchar(100) null,
    last_error_message varchar(1000) null,
    version bigint not null default 0,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_social_publication_bundle_platform unique (bundle_id, platform),
    constraint fk_social_publication_bundle foreign key (bundle_id) references social_publish_bundles (id)
);

create index idx_social_publication_queue
    on social_publications (status, next_attempt_at, id);
create index idx_social_publication_platform_status
    on social_publications (platform, status, created_at);

create table social_publication_attempts (
    id bigint not null auto_increment,
    publication_id bigint not null,
    attempt_number int not null,
    stage varchar(30) not null,
    success bit not null,
    provider_code varchar(100) null,
    message varchar(1000) null,
    created_at datetime(6) not null,
    primary key (id),
    constraint fk_social_attempt_publication foreign key (publication_id) references social_publications (id)
);

create index idx_social_attempt_publication
    on social_publication_attempts (publication_id, created_at);

create table social_account_connections (
    id bigint not null auto_increment,
    platform varchar(20) not null,
    external_user_id varchar(255) not null,
    username varchar(255) null,
    encrypted_access_token longtext not null,
    token_expires_at datetime(6) not null,
    granted_scopes varchar(1000) not null,
    status varchar(30) not null,
    last_verified_at datetime(6) null,
    last_refreshed_at datetime(6) null,
    last_error varchar(1000) null,
    connected_by_id bigint not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_social_connection_platform unique (platform),
    constraint fk_social_connection_connected_by foreign key (connected_by_id) references users (id)
);

create table social_oauth_states (
    id bigint not null auto_increment,
    state_hash varchar(64) not null,
    platform varchar(20) not null,
    requested_by_id bigint not null,
    return_url varchar(500) not null,
    expires_at datetime(6) not null,
    consumed_at datetime(6) null,
    created_at datetime(6) not null,
    primary key (id),
    constraint uk_social_oauth_state_hash unique (state_hash),
    constraint fk_social_oauth_state_requested_by foreign key (requested_by_id) references users (id)
);

create index idx_social_oauth_state_expiry
    on social_oauth_states (expires_at, consumed_at);
