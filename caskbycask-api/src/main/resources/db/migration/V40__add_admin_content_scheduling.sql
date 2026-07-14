alter table notice
    add column published_at datetime(6) null comment '발행 예정/실제 일시' after is_published;

create index idx_notice_published_at on notice (published_at);

alter table ai_news_articles
    add column scheduled_at datetime(6) null after rewrite_requested_at;

create index idx_ai_news_article_scheduled on ai_news_articles (status, scheduled_at);
