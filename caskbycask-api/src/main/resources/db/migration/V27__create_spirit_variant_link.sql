-- 연관 술(다른 배치·병입) 수동 오버라이드.
-- 자동 연결(이름 일치)을 보정: MANUAL=강제 포함, EXCLUDED=강제 제외.
-- 양방향 표현을 위해 한 쌍(pair)당 1행, 정규화(spirit_id = min, related_spirit_id = max).

create table spirit_variant_link (
    id bigint not null auto_increment COMMENT 'PK',
    created_at datetime(6) not null COMMENT '생성 일시',
    updated_at datetime(6) not null COMMENT '수정 일시',
    spirit_id bigint not null COMMENT '정규화 쌍의 작은 주류(spirit.id)',
    related_spirit_id bigint not null COMMENT '정규화 쌍의 큰 주류(spirit.id)',
    link_type enum ('MANUAL','EXCLUDED') not null COMMENT '링크 유형 — MANUAL/EXCLUDED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci COMMENT='연관 주류 링크';

create unique index uk_spirit_variant_link_pair on spirit_variant_link (spirit_id, related_spirit_id);
create index idx_spirit_variant_link_spirit on spirit_variant_link (spirit_id);
create index idx_spirit_variant_link_related on spirit_variant_link (related_spirit_id);
