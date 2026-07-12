alter table ai_news_articles
    add column rewrite_prompt text null after failure_reason,
    add column rewrite_requested_at datetime(6) null after rewrite_prompt;

create index idx_ai_news_article_rewrite_requested
    on ai_news_articles (status, rewrite_requested_at);
