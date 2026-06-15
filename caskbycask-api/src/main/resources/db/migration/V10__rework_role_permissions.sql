-- 역할 관리 개편: 역할 템플릿(role_types) 제거 → 회원별 역할/메모/메뉴 권한으로 이관
-- (Role enum 에 DISTILLERY_STAFF, IMPORTER 추가 — users.role 은 VARCHAR(20) 이라 스키마 변경 불필요)

-- 1) 역할 템플릿(RoleType) 제거
alter table users drop foreign key FKb7edkxkb2uwj3erltmbdux9r7;
alter table users drop column role_type_id;
drop table if exists role_type_allowed_menus;
drop table if exists role_types;

-- 2) 회원별 관리자 메모
alter table users add column description varchar(500) null comment '관리자 메모(역할/권한 설명)';

-- 3) 회원별 접근 허용 메뉴 키(라우트 path)
create table user_menu_permissions (
    user_id  bigint       not null,
    menu_key varchar(255) not null comment '접근 허용 메뉴 키',
    constraint fk_user_menu_perm_user foreign key (user_id) references users (id)
);
