alter table ai_news_source_configs
    add column path_prefix varchar(255) not null default '' after domain;

alter table ai_news_source_configs
    drop index uk_ai_news_source_domain,
    add constraint uk_ai_news_source_scope unique (domain, path_prefix);
