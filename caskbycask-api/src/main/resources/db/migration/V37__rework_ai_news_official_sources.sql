alter table ai_news_source_configs
    add column source_url varchar(1500) null after source_name,
    add column crawl_status varchar(20) not null default 'NOT_CHECKED' after image_use_allowed,
    add column last_crawled_at datetime(6) null after crawl_status,
    add column last_crawl_error varchar(1000) null after last_crawled_at;

update ai_news_source_configs
set source_url = concat('https://', domain, path_prefix)
where source_url is null;

alter table ai_news_source_configs
    modify column source_url varchar(1500) not null,
    drop column crawler_type,
    drop column crawler_target_key,
    drop column crawler_target_value;
