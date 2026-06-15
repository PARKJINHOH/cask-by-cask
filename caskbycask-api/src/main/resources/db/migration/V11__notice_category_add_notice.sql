-- 공지사항: 카테고리에 '공지(NOTICE)' 추가

alter table notice
    modify column category enum ('EVENT','GENERAL','MAINTENANCE','NOTICE','UPDATE') not null comment '분류 — GENERAL/EVENT/UPDATE/MAINTENANCE/NOTICE';
