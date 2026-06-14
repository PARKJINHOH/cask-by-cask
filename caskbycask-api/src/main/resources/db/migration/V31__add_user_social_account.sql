-- =============================================================================
-- CaskByCask — 소셜 로그인(네이버·구글) 계정 연동
-- =============================================================================
-- 작성 기준일: 2026-06-13
-- 범위:
--   1) user_social_account 테이블 추가 — 사용자 ↔ 소셜 제공자 연동 매핑.
--      매핑 기준은 (provider, provider_user_id) UNIQUE (네이버 id / 구글 sub).
--      한 계정에 여러 제공자를 붙일 수 있고 이메일 로그인과 병행 가능.
--      provider_refresh_token_enc 는 AES-GCM 암호화 보관 — 탈퇴/연동해제 시 연결해지 호출용.
--   2) users 의 미사용 단일 소셜 컬럼(oauth_provider/oauth_id)·인덱스 제거 → 위 테이블로 대체.
--
-- [주의]
--   - Flyway 버전 마이그레이션입니다. 적용 후 수정 금지(체크섬). 보정은 V32__*.sql 로 추가.
--   - user_id FK 는 ON DELETE RESTRICT — 탈퇴는 AccountHardDeleteService 가 명시적으로 행을 삭제한다.
-- -----------------------------------------------------------------------------

create table user_social_account (
    id bigint not null auto_increment primary key COMMENT 'PK',
    user_id bigint not null COMMENT '사용자(users.id)',
    provider varchar(20) not null COMMENT '소셜 제공자 — NAVER/GOOGLE',
    provider_user_id varchar(255) not null COMMENT '제공자 고유 식별자',
    email varchar(255) COMMENT '제공자 이메일 스냅샷',
    provider_refresh_token_enc text COMMENT '제공자 refresh token(암호화)',
    linked_at datetime(6) not null COMMENT '연동 일시',
    created_at datetime(6) not null COMMENT '생성 일시',
    updated_at datetime(6) not null COMMENT '수정 일시',
    constraint uk_user_social_provider unique (provider, provider_user_id),
    constraint fk_user_social_user foreign key (user_id) references users (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci COMMENT='사용자 소셜 연동';

create index idx_user_social_user on user_social_account (user_id);

-- 미사용 단일 소셜 컬럼 제거 — 다중 연동은 user_social_account 가 담당
alter table users drop index idx_user_oauth;
alter table users drop column oauth_provider;
alter table users drop column oauth_id;
