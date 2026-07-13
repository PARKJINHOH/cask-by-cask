create table ai_news_draft_requests (
    id bigint not null auto_increment,
    prompt text not null,
    reference_url1 varchar(1500) null,
    reference_url2 varchar(1500) null,
    reference_url3 varchar(1500) null,
    status varchar(20) not null default 'PENDING',
    failure_reason varchar(1000) null,
    article_id bigint null,
    requested_by_id bigint not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint fk_ai_news_draft_request_article foreign key (article_id) references ai_news_articles (id) on delete set null,
    constraint fk_ai_news_draft_request_user foreign key (requested_by_id) references users (id),
    index idx_ai_news_draft_request_queue (status, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='관리자 AI 소식 원고 작성 요청';
