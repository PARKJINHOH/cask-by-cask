-- 개선·문의 (이슈 트래커형 게시판)
-- 로그인 사용자가 기능 버그/개선/기능 추가 요청을 등록하고 상태·진척률을 추적.
-- 작성자 본인 + 관리자(SUPER_ADMIN/ADMIN)만 조회. 조회수 없음.
-- 이메일 단방향 문의(inquiry)와는 별개 테이블.

create table feedback (
    id bigint not null auto_increment,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    resolved_at datetime(6),
    author_id bigint not null,
    title varchar(200) not null,
    content TEXT not null,
    image_urls TEXT,
    progress integer not null,
    comment_count integer not null,
    type enum ('BUG','ETC','FEATURE','IMPROVEMENT') not null,
    status enum ('CONFIRMED','IN_PROGRESS','ON_HOLD','RECEIVED','REJECTED','RESOLVED') not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index idx_feedback_author on feedback (author_id);
create index idx_feedback_status on feedback (status);
create index idx_feedback_created_at on feedback (created_at);

alter table feedback
    add constraint fk_feedback_author
    foreign key (author_id)
    references users (id);

create table feedback_comment (
    id bigint not null auto_increment,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    feedback_id bigint not null,
    author_id bigint not null,
    is_admin_reply bit not null,
    content TEXT not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index idx_feedback_comment_feedback on feedback_comment (feedback_id);

alter table feedback_comment
    add constraint fk_feedback_comment_feedback
    foreign key (feedback_id)
    references feedback (id);

alter table feedback_comment
    add constraint fk_feedback_comment_author
    foreign key (author_id)
    references users (id);
