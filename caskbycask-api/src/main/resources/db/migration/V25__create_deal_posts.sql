-- 주류 핫딜 자동수집 — 크롤러(caskbycask-crawler)가 AI 분석 결과를 적재하는 관리자 검토 큐.
-- POST /api/internal/deals 로 수신 → is_visible=false, status=PENDING.
-- 관리자가 승인하면 is_visible=true / APPROVED 로 전환되어 노출.

create table deal_posts (
    id bigint not null auto_increment,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    crawled_at datetime(6),
    source_url varchar(500) not null,
    source_site varchar(50) not null,
    drink_name varchar(200),
    drink_category varchar(50),
    original_price integer,
    deal_price integer,
    discount_rate decimal(5,4),
    currency varchar(10),
    seller varchar(200),
    deal_condition varchar(500),
    expiry_info varchar(200),
    confidence_score integer,
    summary_ko TEXT,
    is_visible bit not null,
    status enum ('APPROVED','PENDING','REJECTED') not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create unique index uk_deal_posts_source_url on deal_posts (source_url);
create index idx_deal_posts_status on deal_posts (status);
create index idx_deal_posts_created_at on deal_posts (created_at);
