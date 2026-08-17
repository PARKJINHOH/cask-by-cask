-- 사용자 화면 상단 GNB 메뉴의 노출/미노출 설정.
--
-- 메뉴 목록·경로·번역키는 프론트엔드 카탈로그(gnbMenu.ts)가 소유하고 이 테이블은 노출 플래그만 담는다.
-- 행이 없으면 노출이 기본값이라 seed 를 넣지 않는다 — 코드에 메뉴를 추가해도 마이그레이션 없이 바로 보인다.

create table gnb_menu_settings (
    id bigint not null auto_increment,
    menu_key varchar(50) not null comment '프론트 GNB 카탈로그의 메뉴 키',
    is_visible bit not null default 1 comment '노출 여부',
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint ux_gnb_menu_settings_key unique (menu_key)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='사용자 GNB 메뉴 노출 설정';
