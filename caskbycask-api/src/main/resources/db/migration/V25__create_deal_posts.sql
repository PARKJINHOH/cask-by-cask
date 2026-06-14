-- 주류 핫딜 자동수집 — 크롤러(caskbycask-crawler)가 AI 분석 결과를 적재하는 관리자 검토 큐.
-- POST /api/internal/deals 로 수신 → is_visible=false, status=PENDING.
-- 관리자가 승인하면 is_visible=true / APPROVED 로 전환되어 노출.

create table deal_posts (
    id bigint not null auto_increment COMMENT 'PK',
    created_at datetime(6) not null COMMENT '생성 일시',
    updated_at datetime(6) not null COMMENT '수정 일시',
    crawled_at datetime(6) COMMENT '크롤링 수집 시각(UTC)',
    source_url varchar(500) not null COMMENT '원문 URL(멱등키)',
    source_site varchar(50) not null COMMENT '출처 사이트(DCINSIDE/NAVER_CAFE 등)',
    drink_name varchar(200) COMMENT '주류명',
    drink_category varchar(50) COMMENT '주류 카테고리(자유 문자열)',
    original_price integer COMMENT '정가',
    deal_price integer COMMENT '할인가',
    discount_rate decimal(5,4) COMMENT '할인율(0~1)',
    currency varchar(10) COMMENT '통화',
    seller varchar(200) COMMENT '판매처',
    deal_condition varchar(500) COMMENT '구매 조건',
    expiry_info varchar(200) COMMENT '종료/마감 정보',
    confidence_score integer COMMENT 'AI 신뢰도(1~10)',
    summary_ko TEXT COMMENT 'AI 요약(한글)',
    is_visible bit not null COMMENT '노출 여부',
    status enum ('APPROVED','PENDING','REJECTED') not null COMMENT '검토 상태 — PENDING/APPROVED/REJECTED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci COMMENT='주류 핫딜(크롤러 수집·AI분석)';

create unique index uk_deal_posts_source_url on deal_posts (source_url);
create index idx_deal_posts_status on deal_posts (status);
create index idx_deal_posts_created_at on deal_posts (created_at);
