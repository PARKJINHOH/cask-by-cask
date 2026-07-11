-- AI 소식/팁 자동화 메타데이터. 실제 공개 콘텐츠는 기존 posts 테이블이 소유한다.

create table ai_news_settings (
    id bigint not null,
    automation_enabled bit not null default b'0',
    auto_publish_enabled bit not null default b'0',
    dry_run bit not null default b'1',
    daily_release_limit integer not null default 3,
    tip_interval_hours integer not null default 48,
    confidence_threshold decimal(5,4) not null default 0.9000,
    tavily_monthly_credit_limit integer not null default 900,
    openai_monthly_budget_usd decimal(12,4) null,
    openai_monthly_token_limit bigint null,
    openai_monthly_image_limit integer null,
    whisky_ratio integer not null default 60,
    wine_ratio integer not null default 20,
    cognac_ratio integer not null default 20,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='AI 소식 자동화 설정';

create table ai_news_source_configs (
    id bigint not null auto_increment,
    source_name varchar(100) not null,
    domain varchar(255) not null,
    source_type varchar(30) not null,
    enabled bit not null default b'1',
    auto_publish_allowed bit not null default b'0',
    image_use_allowed bit not null default b'0',
    crawler_type varchar(30) null,
    crawler_target_key varchar(255) null,
    crawler_target_value varchar(500) null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_ai_news_source_domain unique (domain)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='AI 소식 출처 및 커뮤니티 수집 설정';

create table ai_news_topics (
    id bigint not null auto_increment,
    title varchar(200) not null,
    normalized_key varchar(255) not null,
    aliases text null,
    category varchar(20) not null,
    status varchar(30) not null default 'READY',
    ai_suggested bit not null default b'0',
    allow_republish bit not null default b'0',
    last_published_at datetime(6) null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_ai_news_topic_key unique (normalized_key)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='AI 팁 및 정보 주제';

create table ai_news_articles (
    id bigint not null auto_increment,
    article_type varchar(30) not null,
    status varchar(30) not null,
    category varchar(20) not null,
    title varchar(300) not null,
    content longtext not null,
    confidence_score decimal(5,4) not null default 0,
    canonical_url_hash varchar(64) null,
    dedupe_key varchar(255) not null,
    semantic_fingerprint varchar(1000) null,
    post_id bigint null,
    deleted_post_id bigint null,
    topic_id bigint null,
    prefix_id bigint null,
    pinned bit not null default b'0',
    update_available bit not null default b'0',
    image_url varchar(1000) null,
    image_kind varchar(30) null,
    image_rights_evidence varchar(1000) null,
    model_name varchar(100) null,
    duplicate_reason varchar(1000) null,
    failure_reason varchar(2000) null,
    published_at datetime(6) null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_ai_news_article_dedupe unique (dedupe_key),
    constraint uk_ai_news_article_canonical_hash unique (canonical_url_hash),
    constraint fk_ai_news_article_topic foreign key (topic_id) references ai_news_topics (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='AI 소식 원고 및 게시글 연결';

create index idx_ai_news_article_status_created on ai_news_articles (status, created_at);
create index idx_ai_news_article_type_published on ai_news_articles (article_type, published_at);
create index idx_ai_news_article_post on ai_news_articles (post_id);

create table ai_news_article_sources (
    id bigint not null auto_increment,
    article_id bigint not null,
    source_url varchar(1500) not null,
    canonical_url varchar(1500) not null,
    domain varchar(255) not null,
    source_title varchar(500) null,
    source_type varchar(30) not null,
    evidence_summary varchar(2000) null,
    content_hash varchar(64) null,
    published_at datetime(6) null,
    retrieved_at datetime(6) not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_ai_news_article_source unique (article_id, domain),
    constraint fk_ai_news_source_article foreign key (article_id) references ai_news_articles (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='AI 소식 내부 근거 출처';

create table ai_news_runs (
    id bigint not null auto_increment,
    run_key varchar(100) not null,
    run_type varchar(30) not null,
    status varchar(30) not null,
    candidate_count integer not null default 0,
    published_count integer not null default 0,
    review_count integer not null default 0,
    duplicate_count integer not null default 0,
    error_count integer not null default 0,
    error_message varchar(2000) null,
    started_at datetime(6) not null,
    finished_at datetime(6) null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint uk_ai_news_run_key unique (run_key)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='AI 소식 크롤러 실행 이력';

create table ai_news_usage (
    id bigint not null auto_increment,
    run_id bigint null,
    provider varchar(30) not null,
    model_name varchar(100) null,
    input_tokens bigint not null default 0,
    output_tokens bigint not null default 0,
    image_count integer not null default 0,
    tavily_credits integer not null default 0,
    estimated_cost_usd decimal(12,6) not null default 0,
    usage_at datetime(6) not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint fk_ai_news_usage_run foreign key (run_id) references ai_news_runs (id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='AI 소식 공급자 사용량';

insert into ai_news_settings (
    id, automation_enabled, auto_publish_enabled, dry_run, daily_release_limit,
    tip_interval_hours, confidence_threshold, tavily_monthly_credit_limit,
    whisky_ratio, wine_ratio, cognac_ratio, created_at, updated_at
) values (1, b'0', b'0', b'1', 3, 48, 0.9000, 900, 60, 20, 20, now(6), now(6));

insert into ai_news_topics (title, normalized_key, aliases, category, status, ai_suggested, allow_republish, created_at, updated_at) values
('위스키 캐스크의 차이', 'whisky-cask-differences', '오크통 차이,캐스크 종류', 'WHISKY', 'READY', b'0', b'0', now(6), now(6)),
('셰리 캐스크란?', 'what-is-sherry-cask', '쉐리 캐스크,셰리 오크통', 'WHISKY', 'READY', b'0', b'0', now(6), now(6)),
('노징 글라스를 사용하는 이유', 'why-use-nosing-glass', '테이스팅 글라스,노징잔', 'WHISKY', 'READY', b'0', b'0', now(6), now(6)),
('와인의 종류', 'types-of-wine', '와인 분류,레드 화이트 스파클링', 'WINE', 'READY', b'0', b'0', now(6), now(6)),
('한국 위스키의 역사', 'history-of-korean-whisky', '국산 위스키 역사,한국 위스키 발전', 'WHISKY', 'READY', b'0', b'0', now(6), now(6)),
('위스키를 마시는 다양한 방법', 'ways-to-drink-whisky', '니트 온더락 하이볼,위스키 음용법', 'WHISKY', 'READY', b'0', b'0', now(6), now(6));

-- 로그인할 수 없는 전용 작성자. ADMIN은 점수/랭킹/출석 대상이 아니다.
insert into users (
    adult_verified, consecutive_attendance, current_level, dormant, email_subscribed,
    email_verified, is_active, maturing_power, must_change_password, nickname_fixed,
    created_at, updated_at, email, password, nickname, role, signup_method
)
select b'0', 0, 1, b'0', b'0', b'1', b'0', 0, b'0', b'1',
       now(6), now(6), 'ai-news@system.caskbycask.local', null, '관리자(AI)', 'ADMIN', 'EMAIL'
where not exists (select 1 from users where email = 'ai-news@system.caskbycask.local');

alter table admin_logs modify column log_type enum (
    'ACCOUNT_DELETE','ACCOUNT_SUSPEND','AI_NEWS_MANAGE','CONTENT_HIDE','CONTENT_RESTORE',
    'ROLE_CHANGE','SCORE_ADJUST'
) not null comment '관리자 활동 로그 유형';
