-- 개선·문의 (이슈 트래커형 게시판)
-- 로그인 사용자가 기능 버그/개선/기능 추가 요청을 등록하고 상태·진척률을 추적.
-- 작성자 본인 + 관리자(SUPER_ADMIN/ADMIN)만 조회. 조회수 없음.
-- 이메일 단방향 문의(inquiry)와는 별개 테이블.

create table feedback (
    id bigint not null auto_increment COMMENT 'PK',
    created_at datetime(6) not null COMMENT '생성 일시',
    updated_at datetime(6) not null COMMENT '수정 일시',
    resolved_at datetime(6) COMMENT '처리 완료 일시',
    author_id bigint not null COMMENT '작성자(users.id)',
    title varchar(200) not null COMMENT '제목',
    content TEXT not null COMMENT '내용',
    image_urls TEXT COMMENT '첨부 이미지 URL(목록)',
    progress integer not null COMMENT '진척률(0~100)',
    comment_count integer not null COMMENT '댓글 수',
    type enum ('BUG','ETC','FEATURE','IMPROVEMENT') not null COMMENT '유형 — BUG/FEATURE/IMPROVEMENT/ETC',
    status enum ('CONFIRMED','IN_PROGRESS','ON_HOLD','RECEIVED','REJECTED','RESOLVED') not null COMMENT '처리 상태 — RECEIVED/CONFIRMED/IN_PROGRESS/ON_HOLD/RESOLVED/REJECTED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci COMMENT='개선·문의(이슈 트래커)';

create index idx_feedback_author on feedback (author_id);
create index idx_feedback_status on feedback (status);
create index idx_feedback_created_at on feedback (created_at);

alter table feedback
    add constraint fk_feedback_author
    foreign key (author_id)
    references users (id);

create table feedback_comment (
    id bigint not null auto_increment COMMENT 'PK',
    created_at datetime(6) not null COMMENT '생성 일시',
    updated_at datetime(6) not null COMMENT '수정 일시',
    feedback_id bigint not null COMMENT '개선·문의(feedback.id)',
    author_id bigint not null COMMENT '작성자(users.id)',
    is_admin_reply bit not null COMMENT '운영팀 답변 여부',
    content TEXT not null COMMENT '댓글 내용',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci COMMENT='개선·문의 댓글';

create index idx_feedback_comment_feedback on feedback_comment (feedback_id);

alter table feedback_comment
    add constraint fk_feedback_comment_feedback
    foreign key (feedback_id)
    references feedback (id);

alter table feedback_comment
    add constraint fk_feedback_comment_author
    foreign key (author_id)
    references users (id);
