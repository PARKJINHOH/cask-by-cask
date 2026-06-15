-- =============================================================================
-- CaskByCask 초기 스키마 베이스라인 (클린 베이스라인)
-- =============================================================================
-- 재생성 기준일: 2026-06-15
-- 생성 방식: 현재 JPA 엔티티 전체로부터 Hibernate(MariaDBDialect)가 생성한 DDL.
--           src/test 의 SchemaDumpTest 로 추출(./gradlew test --tests "*SchemaDumpTest"
--           -Dschema.dump=true) → 각 테이블에 utf8mb4 charset 부여 + 멀티라인 포맷.
--
-- [정책]
--   - Flyway 가 스키마 + 기초데이터(seed)를 모두 소유합니다. (V1=스키마, V2~=seed)
--   - ddl-auto: local/dev=update, prod=none.
--   - 엔티티 스키마를 변경하면 V{n}__*.sql 마이그레이션을 추가하세요.
--     베이스라인 자체를 재생성할 때만(개발 단계) SchemaDumpTest 로 다시 덤프합니다.
--   - 컬럼/테이블 COMMENT 는 엔티티의 @Comment 와 동일 문자열로 유지됩니다.
-- =============================================================================

create table admin_logs (
    actor_id bigint not null comment '행위 관리자(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    target_id bigint not null comment '대상 식별자',
    summary varchar(500) not null comment '요약',
    detail TEXT comment '상세 내용',
    log_type enum ('ACCOUNT_DELETE','ACCOUNT_SUSPEND','CONTENT_HIDE','CONTENT_RESTORE','ROLE_CHANGE','SCORE_ADJUST') not null comment '로그 유형 — ACCOUNT_DELETE/ACCOUNT_SUSPEND/CONTENT_HIDE/CONTENT_RESTORE/ROLE_CHANGE',
    target_type enum ('COMMENT','POST','USER') not null comment '대상 유형 — COMMENT/POST/USER',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='관리자 활동 로그';

create table attendance_logs (
    attendance_date date not null comment '출석 일자',
    streak_count integer not null comment '연속 출석 일수',
    id bigint not null auto_increment comment 'PK',
    user_id bigint not null comment '사용자(users.id)',
    bonus_awarded enum ('NONE','STREAK_30','STREAK_7') not null comment '지급 보너스 — NONE/STREAK_7/STREAK_30',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='출석 체크 로그';

create table bad_words (
    is_active bit not null comment '사용 여부',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    word varchar(100) not null comment '금칙어',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='금칙어(콘텐츠 필터)';

create table banner_images (
    is_used bit not null comment '사용 중 여부',
    banner_id bigint comment '배너(banners.id)',
    created_at datetime(6) not null comment '생성 일시',
    file_size bigint not null comment '파일 크기(byte)',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    uploaded_by_id bigint not null comment '업로더(users.id)',
    mime_type varchar(100) not null comment 'MIME 타입',
    sub_path varchar(100) not null comment '저장 하위 경로',
    image_url varchar(500) not null comment '이미지 URL',
    original_file_name varchar(255) not null comment '원본 파일명',
    saved_file_name varchar(255) not null comment '저장 파일명',
    image_type enum ('MO','PC') not null comment '이미지 유형 — PC/MO(모바일)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='배너 이미지';

create table banners (
    is_always_visible bit not null comment '상시 노출 여부',
    is_visible bit not null comment '노출 여부',
    link_target_blank bit not null comment '링크 새 창 열기 여부',
    sort_order integer not null comment '정렬 순서',
    created_at datetime(6) not null comment '생성 일시',
    created_by_id bigint not null comment '작성 관리자(users.id)',
    end_at datetime(6) comment '노출 종료 일시',
    id bigint not null auto_increment comment 'PK',
    start_at datetime(6) comment '노출 시작 일시',
    updated_at datetime(6) not null comment '수정 일시',
    admin_title varchar(200) not null comment '관리용 제목',
    link_url varchar(500) comment '링크 URL',
    content LONGTEXT comment '본문 HTML(원본)',
    content_sanitized LONGTEXT comment '본문 HTML(XSS 필터링)',
    banner_type enum ('HTML','IMAGE') not null comment '배너 유형 — HTML/IMAGE',
    language enum ('EN','KO') not null comment '언어 — KO/EN',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='메인 배너';

create table byob_comments (
    author_id bigint not null comment '작성자(users.id)',
    byob_id bigint not null comment 'BYOB 모임(byobs.id)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    parent_id bigint comment '부모 댓글(byob_comments.id)',
    participant_user_id bigint not null comment '참가자 사용자(users.id)',
    updated_at datetime(6) not null comment '수정 일시',
    content varchar(200) not null comment '댓글 내용',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='BYOB 모임 댓글';

create table byob_host_bottles (
    byob_id bigint not null,
    bottle_name varchar(100) not null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='호스트 준비 보틀명';

create table byob_participants (
    applied_at datetime(6) not null comment '신청 일시',
    byob_id bigint not null comment 'BYOB 모임(byobs.id)',
    id bigint not null auto_increment comment 'PK',
    spirit_id bigint comment '가져올 주류(spirit.id)',
    user_id bigint not null comment '참가자(users.id)',
    memo varchar(200) comment '참가자 메모',
    removed_reason varchar(300) comment '제외 사유',
    bottle_name varchar(500) not null comment '가져올 보틀명',
    status enum ('APPROVED','PENDING','REJECTED','REMOVED') not null comment '참가 상태 — PENDING/APPROVED/REJECTED/REMOVED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='BYOB 모임 참가자';

create table byobs (
    approved_count integer not null comment '승인된 참가자 수',
    is_pinned bit not null comment 'BYOB 공지(상단 고정) 여부',
    max_participants integer not null comment '최대 참가 인원',
    pending_count integer not null comment '대기 중 참가자 수',
    created_at datetime(6) not null comment '생성 일시',
    event_at datetime(6) not null comment '모임 일시',
    host_id bigint not null comment '호스트(users.id)',
    id bigint not null auto_increment comment 'PK',
    linked_free_post_id bigint comment '연결된 자유게시글(posts.id)',
    recruit_end_at datetime(6) not null comment '모집 종료 일시',
    recruit_start_at datetime(6) not null comment '모집 시작 일시',
    updated_at datetime(6) not null comment '수정 일시',
    location varchar(100) not null comment '장소명',
    title varchar(100) not null comment '모임 제목',
    address varchar(200) not null comment '상세 주소',
    content TEXT not null comment '모임 소개',
    status enum ('CANCELLED','CLOSED','OPEN') not null comment '모임 상태 — OPEN/CLOSED/CANCELLED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='BYOB(Bring Your Own Bottle) 모임';

create table calendar_events (
    end_date date comment '종료 일자',
    is_visible bit not null comment '노출 여부',
    start_date date not null comment '시작 일자',
    created_at datetime(6) not null comment '생성 일시',
    created_by_id bigint not null comment '작성 관리자(users.id)',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    title varchar(200) not null comment '제목',
    link_url varchar(500) comment '링크 URL',
    description TEXT comment '상세 설명',
    category enum ('ETC','EVENT','FESTIVAL','RELEASE') not null comment '분류 — EVENT/FESTIVAL/RELEASE/ETC',
    source enum ('ADMIN','USER') not null comment '등록 출처 — ADMIN(관리자)/USER(사용자 제보)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='캘린더 이벤트';

create table comment_emoji_reactions (
    created_at datetime(6) not null comment '생성 일시',
    emoji_id bigint not null comment '이모지(community_emojis.id)',
    id bigint not null auto_increment comment 'PK',
    target_id bigint not null comment '대상 식별자',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '사용자(users.id)',
    target_type enum ('POST_COMMENT','SPIRIT_COMMENT') not null comment '대상 유형 — POST_COMMENT/SPIRIT_COMMENT',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='댓글 이모지 반응';

create table comment_like (
    comment_id bigint not null comment '시음 댓글(community_comment.id)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '사용자(users.id)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='시음 댓글 좋아요';

create table community_comment (
    is_hidden bit not null comment '숨김 여부',
    like_count integer not null comment '좋아요 수',
    report_count integer not null comment '신고 수',
    created_at datetime(6) not null comment '생성 일시',
    deleted_at datetime(6) comment '삭제 일시(소프트삭제)',
    id bigint not null auto_increment comment 'PK',
    parent_id bigint comment '부모 댓글(community_comment.id)',
    spirit_id bigint not null comment '주류(spirit.id)',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '작성자(users.id)',
    content TEXT not null comment '댓글 내용',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='주류(시음) 댓글';

create table community_emojis (
    is_active bit not null comment '사용 여부',
    sort_order integer not null comment '정렬 순서',
    created_at datetime(6) not null comment '생성 일시',
    group_id bigint comment '이모지 그룹(emoji_groups.id)',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    unicode varchar(10) comment '유니코드 이모지 문자',
    code varchar(50) not null comment '이모지 코드(고유)',
    label varchar(50) not null comment '표시 라벨',
    image_url varchar(500) comment '커스텀 이미지 URL',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='커뮤니티 이모지';

create table content_draft (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '사용자(users.id)',
    draft_key varchar(50) not null comment '임시저장 키(화면 구분)',
    title varchar(300) comment '제목',
    content LONGTEXT comment '본문',
    meta TEXT comment '부가 메타데이터(JSON)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='콘텐츠 임시저장';

create table deal_posts (
    confidence_score integer comment 'AI 신뢰도(1~10)',
    deal_price integer comment '할인가',
    discount_rate decimal(5,4) comment '할인율(0~1)',
    is_visible bit not null comment '노출 여부',
    original_price integer comment '정가',
    crawled_at datetime(6) comment '크롤링 수집 시각(UTC)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    currency varchar(10) comment '통화',
    drink_category varchar(50) comment '주류 카테고리(자유 문자열)',
    source_site varchar(50) not null comment '출처 사이트(DCINSIDE/NAVER_CAFE 등)',
    drink_name varchar(200) comment '주류명',
    expiry_info varchar(200) comment '종료/마감 정보',
    seller varchar(200) comment '판매처',
    deal_condition varchar(500) comment '구매 조건',
    source_url varchar(500) not null comment '원문 URL(멱등키)',
    summary_ko TEXT comment 'AI 요약(한글)',
    status enum ('APPROVED','PENDING','REJECTED') not null comment '검토 상태 — PENDING/APPROVED/REJECTED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='주류 핫딜(크롤러 수집·AI분석)';

create table deleted_posts (
    author_id bigint not null comment '원작성자(users.id)',
    deleted_at datetime(6) not null comment '삭제 일시',
    deleted_by bigint not null comment '삭제 처리자(users.id)',
    id bigint not null auto_increment comment 'PK',
    original_created_at datetime(6) not null comment '원글 작성 일시',
    original_post_id bigint not null comment '원글 식별자(posts.id)',
    title varchar(300) not null comment '원글 제목',
    delete_reason varchar(500) comment '삭제 사유',
    board_type enum ('FREE','NOTICE') not null comment '게시판 유형 — FREE/NOTICE',
    content LONGTEXT comment '본문 HTML(원본)',
    content_sanitized LONGTEXT comment '본문 HTML(XSS 필터링)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='삭제된 게시글 보관';

create table email_send_logs (
    fail_count integer not null comment '실패 건수',
    success_count integer not null comment '성공 건수',
    total_count integer not null comment '전체 대상 건수',
    id bigint not null auto_increment comment 'PK',
    sent_at datetime(6) not null comment '발송 일시',
    subject varchar(300) not null comment '제목',
    body TEXT not null comment '본문',
    send_type enum ('BULK','TEST') not null comment '발송 유형 — BULK(일괄)/TEST',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='이메일 발송 로그';

create table email_send_recipients (
    success bit not null comment '발송 성공 여부',
    id bigint not null auto_increment comment 'PK',
    log_id bigint comment '발송 로그(email_send_logs.id)',
    nickname varchar(20) comment '수신자 닉네임',
    error_message varchar(500) comment '실패 사유',
    email varchar(255) not null comment '수신 이메일',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='이메일 수신자별 발송 결과';

create table email_templates (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    name varchar(100) not null comment '템플릿 이름',
    subject varchar(300) not null comment '제목',
    body TEXT not null comment '본문',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='이메일 템플릿';

create table emoji_groups (
    is_active bit not null comment '사용 여부',
    sort_order integer not null comment '정렬 순서',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    name varchar(50) not null comment '그룹명',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='이모지 그룹';

create table faqs (
    is_active bit not null comment '노출 여부',
    sort_order integer not null comment '정렬 순서',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    question varchar(500) not null comment '질문',
    answer TEXT not null comment '답변',
    category enum ('COGNAC','SERVICE','WHISKY','WINE') not null comment '분류 — WHISKY/WINE/COGNAC/SERVICE',
    language enum ('EN','KO') not null comment '언어 — KO/EN',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='자주 묻는 질문';

create table feedback (
    comment_count integer not null comment '댓글 수',
    is_public bit not null comment '공개 여부',
    progress integer not null comment '진척률(0~100)',
    author_id bigint not null comment '작성자(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    resolved_at datetime(6) comment '처리 완료 일시',
    updated_at datetime(6) not null comment '수정 일시',
    title varchar(200) not null comment '제목',
    content TEXT not null comment '내용',
    image_urls TEXT comment '첨부 이미지 URL(목록)',
    status enum ('CONFIRMED','IN_PROGRESS','ON_HOLD','RECEIVED','REJECTED','RESOLVED') not null comment '처리 상태 — RECEIVED/CONFIRMED/IN_PROGRESS/ON_HOLD/RESOLVED/REJECTED',
    type enum ('BUG','ETC','FEATURE','IMPROVEMENT') not null comment '유형 — BUG/FEATURE/IMPROVEMENT/ETC',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='개선·문의(이슈 트래커)';

create table feedback_comment (
    is_admin_reply bit not null comment '운영팀 답변 여부',
    author_id bigint not null comment '작성자(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    feedback_id bigint not null comment '개선·문의(feedback.id)',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    content TEXT not null comment '댓글 내용',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='개선·문의 댓글';

create table inquiry (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    replied_at datetime(6) comment '답변 일시',
    updated_at datetime(6) not null comment '수정 일시',
    replied_by varchar(200) comment '답변자',
    sender_email varchar(200) not null comment '문의자 이메일',
    title varchar(200) not null comment '제목',
    admin_note TEXT comment '관리자 메모',
    body TEXT not null comment '문의 내용',
    image_urls TEXT comment '첨부 이미지 URL(목록)',
    reply_body TEXT comment '답변 내용',
    category enum ('ACCOUNT_INQUIRY','BUG_REPORT','CORRECTION_REQUEST','FEATURE_REQUEST','OTHER') not null comment '분류 — ACCOUNT_INQUIRY/BUG_REPORT/CORRECTION_REQUEST/FEATURE_REQUEST/OTHER',
    status enum ('IN_PROGRESS','PENDING','RESOLVED') not null comment '처리 상태 — PENDING/IN_PROGRESS/RESOLVED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='1:1 문의';

create table legal_documents (
    is_active bit not null comment '현재 적용본 여부',
    author_id bigint comment '작성 관리자(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    version varchar(50) not null comment '버전',
    content LONGTEXT not null comment '본문 HTML(원본)',
    content_sanitized LONGTEXT not null comment '본문 HTML(XSS 필터링)',
    type enum ('PRIVACY_POLICY','TERMS') not null comment '문서 유형 — TERMS(약관)/PRIVACY_POLICY(개인정보)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='약관·개인정보 처리방침 문서';

create table member_level_config (
    is_active bit not null comment '사용 여부',
    level integer not null comment '레벨',
    min_score integer not null comment '도달 최소 점수',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    name varchar(50) not null comment '등급명',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='회원 레벨(등급) 설정';

create table message_items (
    is_read bit not null comment '읽음 여부',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    message_id bigint not null comment '쪽지 대화(messages.id)',
    read_at datetime(6) comment '읽은 일시',
    sender_id bigint not null comment '보낸 사람(users.id)',
    updated_at datetime(6) not null comment '수정 일시',
    content LONGTEXT not null comment '메시지 내용',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table messages (
    is_deleted_by_receiver bit not null comment '수신자 삭제 여부',
    is_deleted_by_sender bit not null comment '발신자 삭제 여부',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    receiver_id bigint not null comment '수신자(users.id)',
    sender_id bigint not null comment '발신자(users.id)',
    updated_at datetime(6) not null comment '수정 일시',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table nickname_bad_words (
    is_active bit not null comment '사용 여부',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    word varchar(100) not null comment '닉네임 금칙어',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='닉네임 금칙어';

create table notice (
    is_pinned bit not null comment '상단 고정 여부',
    is_published bit not null comment '게시 여부',
    author_id bigint not null comment '작성자(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    deleted_at datetime(6) comment '삭제 일시(소프트삭제)',
    id bigint not null auto_increment comment 'PK',
    recommend_count bigint not null comment '추천 수',
    updated_at datetime(6) not null comment '수정 일시',
    view_count bigint not null comment '조회 수',
    title varchar(300) not null comment '제목',
    content LONGTEXT not null comment '본문 HTML(원본)',
    content_sanitized LONGTEXT not null comment '본문 HTML(XSS 필터링)',
    category enum ('EVENT','GENERAL','MAINTENANCE','UPDATE') not null comment '분류 — GENERAL/EVENT/UPDATE/MAINTENANCE',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='공지사항';

create table notice_image (
    is_used bit not null comment '사용 중 여부',
    created_at datetime(6) not null comment '생성 일시',
    file_size bigint not null comment '파일 크기(byte)',
    id bigint not null auto_increment comment 'PK',
    notice_id bigint comment '공지(notice.id)',
    updated_at datetime(6) not null comment '수정 일시',
    uploaded_by_id bigint not null comment '업로더(users.id)',
    mime_type varchar(100) not null comment 'MIME 타입',
    sub_path varchar(100) not null comment '저장 하위 경로',
    image_url varchar(500) not null comment '이미지 URL',
    original_file_name varchar(255) not null comment '원본 파일명',
    saved_file_name varchar(255) not null comment '저장 파일명',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='공지 이미지';

create table notice_recommend (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    notice_id bigint not null comment '공지(notice.id)',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '사용자(users.id)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='공지 추천';

create table notifications (
    is_read bit not null comment '읽음 여부',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    recipient_id bigint not null comment '수신자(users.id)',
    target_id bigint comment '대상 식별자',
    target_type varchar(50) comment '대상 유형',
    message varchar(200) not null comment '알림 메시지',
    type enum ('BYOB_APPLY','BYOB_APPROVE','BYOB_REJECT','BYOB_REMOVE','COMMENT','LIKE','MENTION','MESSAGE','PRICE_ALERT','REPLY','REQUEST_APPROVED','REQUEST_REJECTED','SYSTEM') not null comment '알림 유형 — COMMENT/REPLY/LIKE/MENTION/MESSAGE/BYOB_*/PRICE_ALERT/REQUEST_*/SYSTEM',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='알림';

create table poll_options (
    sort_order integer not null comment '정렬 순서',
    vote_count integer not null comment '득표 수',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    poll_id bigint not null comment '투표(polls.id)',
    updated_at datetime(6) not null comment '수정 일시',
    option_text varchar(200) not null comment '선택지 내용',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table poll_votes (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    option_id bigint not null comment '선택지(poll_options.id)',
    poll_id bigint not null comment '투표(polls.id)',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '투표자(users.id)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table polls (
    is_multiple_choice bit not null comment '복수 선택 허용 여부',
    created_at datetime(6) not null comment '생성 일시',
    ends_at datetime(6) comment '투표 마감 일시',
    id bigint not null comment 'PK(posts.id 공유)',
    updated_at datetime(6) not null comment '수정 일시',
    question varchar(300) not null comment '투표 질문',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='게시글 투표';

create table popup_images (
    is_used bit not null comment '사용 중 여부',
    created_at datetime(6) not null comment '생성 일시',
    file_size bigint not null comment '파일 크기(byte)',
    id bigint not null auto_increment comment 'PK',
    popup_id bigint comment '팝업(popups.id)',
    updated_at datetime(6) not null comment '수정 일시',
    uploaded_by_id bigint not null comment '업로더(users.id)',
    mime_type varchar(100) not null comment 'MIME 타입',
    sub_path varchar(100) not null comment '저장 하위 경로',
    image_url varchar(500) not null comment '이미지 URL',
    original_file_name varchar(255) not null comment '원본 파일명',
    saved_file_name varchar(255) not null comment '저장 파일명',
    image_type enum ('CONTENT','MAIN') not null comment '이미지 유형 — MAIN/CONTENT',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='팝업 이미지';

create table popups (
    close_on_overlay bit not null comment '배경 클릭 시 닫기 여부',
    is_always_visible bit not null comment '상시 노출 여부',
    is_visible bit not null comment '노출 여부',
    link_target_blank bit not null comment '링크 새 창 열기 여부',
    sort_order integer not null comment '정렬 순서',
    created_at datetime(6) not null comment '생성 일시',
    created_by_id bigint not null comment '작성 관리자(users.id)',
    end_at datetime(6) comment '노출 종료 일시',
    id bigint not null auto_increment comment 'PK',
    start_at datetime(6) comment '노출 시작 일시',
    updated_at datetime(6) not null comment '수정 일시',
    admin_title varchar(200) not null comment '관리용 제목',
    link_url varchar(500) comment '링크 URL',
    content LONGTEXT comment '본문 HTML(원본)',
    content_sanitized LONGTEXT comment '본문 HTML(XSS 필터링)',
    display_page enum ('MAIN') not null comment '노출 페이지 — MAIN',
    language enum ('EN','KO') not null comment '언어 — KO/EN',
    popup_type enum ('HTML','IMAGE') not null comment '팝업 유형 — HTML/IMAGE',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='메인 팝업';

create table post_comments (
    is_anonymous bit not null comment '익명 여부',
    is_hidden bit not null comment '숨김 여부',
    is_secret bit not null comment '비밀 댓글 여부',
    report_count integer not null comment '신고 수',
    author_id bigint not null comment '작성자(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    deleted_at datetime(6) comment '삭제 일시(소프트삭제)',
    id bigint not null auto_increment comment 'PK',
    mentioned_user_id bigint comment '멘션된 사용자(users.id)',
    parent_id bigint comment '부모 댓글(post_comments.id)',
    post_id bigint comment '게시글(posts.id)',
    updated_at datetime(6) not null comment '수정 일시',
    content LONGTEXT not null comment '댓글 내용',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table post_images (
    is_used bit not null comment '사용 중 여부',
    created_at datetime(6) not null comment '생성 일시',
    file_size bigint not null comment '파일 크기(byte)',
    id bigint not null auto_increment comment 'PK',
    post_id bigint comment '게시글(posts.id)',
    updated_at datetime(6) not null comment '수정 일시',
    uploaded_by_id bigint not null comment '업로더(users.id)',
    mime_type varchar(100) not null comment 'MIME 타입',
    sub_path varchar(200) not null comment '저장 하위 경로',
    image_url varchar(500) not null comment '이미지 URL',
    original_file_name varchar(255) not null comment '원본 파일명',
    saved_file_name varchar(255) not null comment '저장 파일명',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table post_likes (
    is_like bit not null comment '좋아요(true)/싫어요(false)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    post_id bigint not null comment '게시글(posts.id)',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '사용자(users.id)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table post_prefixes (
    is_active bit not null comment '사용 여부',
    sort_order integer not null comment '정렬 순서',
    color_hex varchar(7) comment '색상(HEX)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    name varchar(20) not null comment '말머리명',
    board_type enum ('FREE','NOTICE') not null comment '게시판 유형 — FREE/NOTICE',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table post_reports (
    comment_id bigint comment '신고 댓글(post_comments.id)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    post_id bigint comment '신고 게시글(posts.id)',
    reporter_id bigint not null comment '신고자(users.id)',
    resolved_at datetime(6) comment '처리 일시',
    updated_at datetime(6) not null comment '수정 일시',
    reason varchar(500) comment '신고 사유',
    status enum ('DISMISSED','PENDING','RESOLVED') not null comment '처리 상태 — PENDING/RESOLVED/DISMISSED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table post_scraps (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    post_id bigint not null comment '게시글(posts.id)',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '사용자(users.id)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table post_videos (
    is_used bit not null comment '사용 중 여부',
    created_at datetime(6) not null comment '생성 일시',
    file_size bigint not null comment '파일 크기(byte)',
    id bigint not null auto_increment comment 'PK',
    post_id bigint comment '게시글(posts.id)',
    updated_at datetime(6) not null comment '수정 일시',
    uploaded_by_id bigint not null comment '업로더(users.id)',
    mime_type varchar(100) not null comment 'MIME 타입',
    sub_path varchar(200) not null comment '저장 하위 경로',
    video_url varchar(500) not null comment '동영상 URL',
    original_file_name varchar(255) not null comment '원본 파일명',
    saved_file_name varchar(255) not null comment '저장 파일명',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table posts (
    adult_only bit not null comment '성인 전용 여부',
    comment_count integer not null comment '댓글 수',
    is_anonymous bit not null comment '익명 여부',
    is_hidden bit not null comment '숨김 여부',
    is_pinned bit not null comment '게시판 공지(상단 고정) 여부',
    like_count integer not null comment '좋아요 수',
    report_count integer not null comment '신고 수',
    series_order integer comment '시리즈 내 순서',
    author_id bigint not null comment '작성자(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    distillery_tag_id bigint comment '증류소 태그(producer.id)',
    id bigint not null auto_increment comment 'PK',
    prefix_id bigint comment '말머리(post_prefixes.id)',
    series_id bigint comment '시리즈(series.id)',
    updated_at datetime(6) not null comment '수정 일시',
    view_count bigint not null comment '조회 수',
    title varchar(300) not null comment '제목',
    board_type enum ('FREE','NOTICE') not null comment '게시판 유형 — FREE/NOTICE',
    content LONGTEXT not null comment '본문 HTML(원본)',
    content_sanitized LONGTEXT not null comment '본문 HTML(XSS 필터링)',
    status enum ('ACTIVE','DELETED','LOCKED') not null comment '상태 — ACTIVE/LOCKED/DELETED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table price_alerts (
    is_active bit not null comment '알림 활성 여부',
    target_price_krw decimal(12,0) comment '목표 가격(원)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    last_notified_at datetime(6) comment '마지막 알림 일시',
    spirit_id bigint not null comment '주류(spirit.id)',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '사용자(users.id)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='가격 알림 설정';

create table price_discount_items (
    discount_amount decimal(12,0) not null comment '할인 금액',
    id bigint not null auto_increment comment 'PK',
    price_report_id bigint not null comment '가격 제보(price_reports.id)',
    description varchar(200) comment '할인 설명',
    discount_type enum ('BUNDLE','COUPON','OTHER','PAYMENT') not null comment '할인 유형 — COUPON/PAYMENT/BUNDLE/OTHER',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='가격 제보 할인 항목';

create table price_report_images (
    is_public bit not null comment '공개 여부',
    sort_order integer not null comment '정렬 순서',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    price_report_id bigint comment '가격 제보(price_reports.id)',
    updated_at datetime(6) not null comment '수정 일시',
    uploaded_by_id bigint not null comment '업로더(users.id)',
    mime_type varchar(50) not null comment 'MIME 타입',
    sub_path varchar(100) not null comment '저장 하위 경로',
    image_url varchar(500) not null comment '이미지 URL',
    original_file_name varchar(255) comment '원본 파일명',
    saved_file_name varchar(255) not null comment '저장 파일명',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='가격 제보 이미지';

create table price_report_reports (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    price_report_id bigint not null comment '가격 제보(price_reports.id)',
    reporter_id bigint not null comment '신고자(users.id)',
    resolved_at datetime(6) comment '처리 일시',
    resolved_by_id bigint comment '처리자(users.id)',
    updated_at datetime(6) not null comment '수정 일시',
    reason_detail varchar(500) comment '신고 상세',
    reason enum ('BAD_IMAGE','DUPLICATE','FALSE_PRICE','OTHER') not null comment '신고 사유 — FALSE_PRICE/DUPLICATE/BAD_IMAGE/OTHER',
    status enum ('DISMISSED','PENDING','RESOLVED') not null comment '처리 상태 — PENDING/RESOLVED/DISMISSED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='가격 제보 신고';

create table price_reports (
    actual_price decimal(12,0) comment '실구매가',
    auto_flagged bit not null comment '자동 이상치 플래그 여부',
    exchange_rate_snapshot decimal(10,4) comment '환율 스냅샷',
    is_anonymous bit not null comment '익명 여부',
    is_verified bit not null comment '검증 완료 여부',
    payback_amount decimal(12,0) comment '페이백 금액',
    price decimal(12,0) comment '정가',
    purchased_at date comment '구매 일자',
    report_count integer not null comment '신고 수',
    sale_price decimal(12,0) comment '행사가',
    approved_at datetime(6) comment '승인 일시',
    approved_by_id bigint comment '승인자(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    deleted_at datetime(6) comment '삭제 일시(소프트삭제)',
    id bigint not null auto_increment comment 'PK',
    rejected_at datetime(6) comment '반려 일시',
    reporter_id bigint comment '제보자(users.id)',
    spirit_id bigint not null comment '주류(spirit.id)',
    store_id bigint comment '판매처(stores.id)',
    updated_at datetime(6) not null comment '수정 일시',
    description varchar(500) comment '제보 설명',
    reject_reason varchar(500) comment '반려 사유',
    suggested_store_name varchar(255) comment '제안 판매처명(미등록)',
    currency enum ('KRW','USD') not null comment '통화 — KRW/USD',
    status enum ('APPROVED','PENDING','REJECTED') not null comment '상태 — PENDING/APPROVED/REJECTED',
    suggested_dutyfree_channel enum ('AIRPORT','CITY','INFLIGHT','ONLINE') comment '면세 채널 제안 — AIRPORT/CITY/INFLIGHT/ONLINE',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='가격 제보';

create table producer (
    founded_year integer comment '설립 연도',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    country varchar(100) not null comment '국가',
    region varchar(100) comment '지역',
    name_en varchar(200) not null comment '생산자명(영문)',
    name_ko varchar(200) not null comment '생산자명(한글)',
    search_keywords varchar(300) comment '검색 별칭(공백/콤마 구분)',
    website varchar(500) comment '웹사이트',
    description_en TEXT comment '설명(영문)',
    description_ko TEXT comment '설명(한글)',
    type enum ('COGNAC_HOUSE','DISTILLERY','OTHER','WINERY') not null comment '생산자 유형 — DISTILLERY/WINERY/COGNAC_HOUSE/OTHER',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='생산자(증류소/와이너리/꼬냑하우스)';

create table producer_register_request (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    reviewed_at datetime(6) comment '심사 일시',
    reviewed_by_id bigint comment '심사자(users.id)',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '신청자(users.id)',
    producer_data TEXT not null comment '신청 생산자 데이터(JSON)',
    reject_reason TEXT comment '반려 사유',
    status enum ('APPROVED','PENDING','REJECTED') not null comment '심사 상태 — PENDING/APPROVED/REJECTED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='생산자 등록 요청';

create table report (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    reporter_id bigint not null comment '신고자(users.id)',
    resolved_at datetime(6) comment '처리 일시',
    target_id bigint not null comment '대상 식별자',
    updated_at datetime(6) not null comment '수정 일시',
    reason varchar(500) comment '신고 사유',
    status enum ('DISMISSED','PENDING','RESOLVED') not null comment '처리 상태 — PENDING/RESOLVED/DISMISSED',
    target_type enum ('COMMENT','IMAGE','REVIEW') not null comment '대상 유형 — REVIEW/COMMENT/IMAGE',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='신고(리뷰/댓글/이미지)';

create table review (
    finish_score decimal(4,1) not null,
    is_hidden bit not null,
    nose_score decimal(4,1) not null,
    report_count integer not null,
    taste_score decimal(4,1) not null,
    total_score decimal(4,1) not null,
    created_at datetime(6) not null comment '생성 일시',
    deleted_at datetime(6),
    id bigint not null auto_increment,
    spirit_id bigint not null,
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null,
    finish_note varchar(300),
    nose_note varchar(300),
    taste_note varchar(300),
    comment varchar(500),
    finish_aroma_wheel_notes varchar(800),
    nose_aroma_wheel_notes varchar(800),
    taste_aroma_wheel_notes varchar(800),
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table role_type_allowed_menus (
    role_type_id bigint not null,
    menu_key enum ('PRODUCERS','PRODUCER_REQUESTS','SPIRITS','SPIRIT_REQUESTS')
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='허용 메뉴 — PRODUCERS/PRODUCER_REQUESTS/SPIRITS/SPIRIT_REQUESTS';

create table role_types (
    is_active bit not null comment '사용 여부',
    sort_order integer not null comment '정렬 순서',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    name varchar(100) not null comment '역할명',
    description varchar(500) comment '역할 설명',
    system_role enum ('ADMIN','MEMBER','MODERATOR','PARTNER','SUPER_ADMIN') not null comment '시스템 역할 — SUPER_ADMIN/ADMIN/MODERATOR/PARTNER/MEMBER',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='역할(권한 그룹)';

create table score_config (
    daily_limit integer comment '일일 적립 한도(횟수)',
    is_active bit not null comment '사용 여부',
    score integer not null comment '적립 점수',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    action_type varchar(50) not null comment '행동 유형(고유)',
    description varchar(200) comment '설명',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='점수 적립 정책';

create table score_history (
    balance_after integer not null comment '적립 후 잔액',
    score integer not null comment '증감 점수',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    reference_id bigint comment '관련 대상 식별자',
    user_id bigint not null comment '사용자(users.id)',
    action_type varchar(50) not null comment '행동 유형',
    reference_type varchar(50) comment '관련 대상 유형',
    description varchar(200) comment '설명',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='점수 적립/차감 이력';

create table series (
    post_count integer not null comment '게시글 수',
    author_id bigint not null comment '작성자(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    title varchar(200) not null comment '시리즈 제목',
    description varchar(500) comment '시리즈 설명',
    board_type enum ('FREE','NOTICE') not null comment '게시판 유형 — FREE/NOTICE',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table spirit (
    abv decimal(4,1) comment '도수(%)',
    avg_score decimal(4,1) comment '평균 평점',
    bottled_year integer comment '병입 연도',
    review_count integer not null comment '리뷰 수',
    vintage_year integer comment '빈티지 연도',
    volume_ml integer comment '용량(ml)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    producer_id bigint comment '생산자(producer.id)',
    registered_by_id bigint comment '등록자(users.id)',
    updated_at datetime(6) not null comment '수정 일시',
    country varchar(100) comment '국가',
    region varchar(100) comment '지역',
    bottler varchar(200) comment '병입자',
    name_en varchar(200) not null comment '주류명(영문)',
    name_ko varchar(200) not null comment '주류명(한글)',
    category enum ('COGNAC','OTHER','WHISKY','WINE') not null comment '카테고리 — WHISKY/WINE/COGNAC/OTHER',
    status enum ('ACTIVE','HIDDEN','PENDING') not null comment '상태 — ACTIVE/HIDDEN/PENDING',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='주류(위스키/와인/꼬냑/기타)';

create table spirit_cognac_detail (
    is_fine_champagne bit comment '핀 샹파뉴 여부',
    spirit_id bigint not null comment '주류(spirit.id, PK)',
    extra_data TEXT comment '추가 데이터(JSON)',
    cru enum ('BONS_BOIS','BORDERIES','FINS_BOIS','GRANDE_CHAMPAGNE','PETITE_CHAMPAGNE') comment '크뤼(원산지) — GRANDE_CHAMPAGNE/PETITE_CHAMPAGNE/BORDERIES/FINS_BOIS/BONS_BOIS',
    grade enum ('HORS_DAGE','NAPOLEON','VS','VSOP','XO','XXO') comment '등급 — VS/VSOP/NAPOLEON/XO/XXO/HORS_DAGE',
    primary key (spirit_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='주류 상세 - 꼬냑';

create table spirit_common_detail (
    abv decimal(4,1) comment '도수(%)',
    age_statement integer comment '숙성 연수(년)',
    is_nas bit not null comment 'NAS(숙성연수 미표기) 여부',
    release_date date comment '출시일',
    total_bottles integer comment '총 병입 수량',
    volume_ml integer comment '용량(ml)',
    bottled_date varchar(7) comment '병입 연월(YYYY-MM)',
    distilled_date varchar(7) comment '증류 연월(YYYY-MM)',
    spirit_id bigint not null comment '주류(spirit.id, PK)',
    bottle_no varchar(50) comment '보틀 번호',
    batch_no varchar(100) comment '배치 번호',
    primary key (spirit_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='주류 공통 상세';

create table spirit_image (
    is_primary bit not null comment '대표 이미지 여부',
    sort_order integer not null comment '정렬 순서',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    spirit_id bigint not null comment '주류(spirit.id)',
    updated_at datetime(6) not null comment '수정 일시',
    image_url varchar(500) not null comment '이미지 URL',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='주류 이미지';

create table spirit_other_detail (
    spirit_id bigint not null comment '주류(spirit.id, PK)',
    extra_data TEXT comment '추가 데이터(JSON)',
    other_type enum ('ABSINTHE','BAIJIU','BEER','BRANDY','GIN','LIQUEUR','MEZCAL','OTHER','RUM','SAKE','SOJU','TEQUILA','VODKA') comment '기타 주종 — RUM/GIN/VODKA/TEQUILA/MEZCAL/BRANDY/LIQUEUR/SAKE/SOJU/BAIJIU/BEER/ABSINTHE/OTHER',
    primary key (spirit_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='주류 상세 - 기타 주종';

create table spirit_register_request (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    reviewed_at datetime(6) comment '심사 일시',
    reviewed_by_id bigint comment '심사자(users.id)',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '신청자(users.id)',
    reject_reason TEXT comment '반려 사유',
    spirit_data TEXT not null comment '신청 주류 데이터(JSON)',
    status enum ('APPROVED','PENDING','REJECTED') not null comment '심사 상태 — PENDING/APPROVED/REJECTED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='주류 등록 요청';

create table spirit_variant_link (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    related_spirit_id bigint not null comment '정규화 쌍의 큰 주류(spirit.id)',
    spirit_id bigint not null comment '정규화 쌍의 작은 주류(spirit.id)',
    updated_at datetime(6) not null comment '수정 일시',
    link_type enum ('EXCLUDED','MANUAL') not null comment '링크 유형 — MANUAL/EXCLUDED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='연관 주류 링크';

create table spirit_whisky_detail (
    is_cask_strength bit comment '캐스크 스트렝스 여부',
    is_natural_colour bit comment '무착색 여부',
    is_non_chill_filtered bit comment '비냉각여과 여부',
    is_peated bit comment '피트 사용 여부',
    is_single_cask bit comment '싱글 캐스크 여부',
    phenol_ppm integer comment '페놀 수치(ppm)',
    spirit_id bigint not null comment '주류(spirit.id, PK)',
    extra_data TEXT comment '추가 데이터(JSON)',
    bottling_type enum ('IB','OB') comment '병입 유형 — OB(공식)/IB(독립)',
    style enum ('BLENDED_MALT','BLENDED_WHISKY','BOURBON','GRAIN_CORN','OTHER','POT_STILL','RYE','SINGLE_MALT','TENNESSEE','WHEATED_BOURBON') comment '위스키 스타일 — SINGLE_MALT/BLENDED_MALT/BLENDED_WHISKY/GRAIN_CORN/BOURBON/WHEATED_BOURBON/RYE/POT_STILL/TENNESSEE/OTHER',
    primary key (spirit_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='주류 상세 - 위스키';

create table spirit_wine_detail (
    is_natural_wine bit comment '내추럴 와인 여부',
    is_oak_aged bit comment '오크 숙성 여부',
    vintage integer comment '빈티지 연도',
    spirit_id bigint not null comment '주류(spirit.id, PK)',
    extra_data TEXT comment '추가 데이터(JSON)',
    certification enum ('BIODYNAMIC','NONE','ORGANIC','SUSTAINABLE') comment '인증 — NONE/ORGANIC/BIODYNAMIC/SUSTAINABLE',
    wine_type enum ('DESSERT','FORTIFIED','ORANGE','RED','ROSE','SPARKLING','WHITE') comment '와인 유형 — RED/WHITE/ROSE/SPARKLING/DESSERT/ORANGE',
    primary key (spirit_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='주류 상세 - 와인';

create table store_aliases (
    id bigint not null auto_increment comment 'PK',
    store_id bigint not null comment '판매처(stores.id)',
    alias varchar(200) not null comment '판매처 별칭',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='판매처 별칭';

create table stores (
    is_approved bit not null comment '승인 여부',
    approved_at datetime(6) comment '승인 일시',
    approved_by_id bigint comment '승인자(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    created_by_id bigint comment '등록자(users.id)',
    deleted_at datetime(6) comment '삭제 일시(소프트삭제)',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    region varchar(100) comment '지역',
    display_name varchar(255) not null comment '표시명',
    dutyfree_channel enum ('AIRPORT','CITY','INFLIGHT','ONLINE') comment '면세 채널 — AIRPORT/CITY/INFLIGHT/ONLINE',
    store_type enum ('DOMESTIC','DUTYFREE') not null comment '판매처 유형 — DOMESTIC(국내)/DUTYFREE(면세)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='판매처(매장/면세)';

create table user_blocks (
    blocked_id bigint not null comment '차단 대상(users.id)',
    blocker_id bigint not null comment '차단한 사용자(users.id)',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    updated_at datetime(6) not null comment '수정 일시',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='사용자 차단';

create table user_board_permissions (
    user_id bigint not null,
    board_type enum ('FREE','NOTICE')
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='쓰기 허용 게시판 — FREE/NOTICE';

create table user_bottle (
    is_public bit not null comment '공개 여부',
    price integer not null comment '구매 가격(원)',
    purchase_date date not null comment '구매 일자',
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    spirit_id bigint comment '주류(spirit.id)',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '소유자(users.id)',
    batch varchar(100) comment '배치',
    bottling_year varchar(100) comment '병입 연도',
    spirit_name_text varchar(200) comment '주류명(직접 입력, 미등록 시)',
    store varchar(200) not null comment '구매처',
    memo TEXT comment '메모',
    category enum ('COGNAC','OTHER','WHISKY','WINE') not null comment '카테고리 — WHISKY/WINE/COGNAC/OTHER',
    status enum ('OPENED','UNOPENED') not null comment '개봉 상태 — UNOPENED/OPENED',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='보유 보틀(컬렉션)';

create table user_bottle_image (
    sort_order integer not null comment '정렬 순서',
    id bigint not null auto_increment comment 'PK',
    user_bottle_id bigint not null comment '보유 보틀(user_bottle.id)',
    image_url varchar(500) not null comment '이미지 URL',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='보유 보틀 이미지';

create table user_social_account (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    linked_at datetime(6) not null comment '연동 일시',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '사용자(users.id)',
    email varchar(255) comment '제공자 이메일 스냅샷',
    provider_user_id varchar(255) not null comment '제공자 고유 식별자',
    provider enum ('GOOGLE','NAVER') not null comment '소셜 제공자 — NAVER/GOOGLE',
    provider_refresh_token_enc TEXT comment '제공자 refresh token(암호화)',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='사용자 소셜 연동';

create table users (
    adult_birth_date date comment '생년월일(연령확인)',
    adult_verified bit not null comment '성인인증 완료 여부',
    consecutive_attendance integer not null comment '연속 출석 일수',
    current_level integer not null comment '현재 레벨',
    dormant bit not null comment '휴면 여부',
    email_subscribed bit not null comment '이메일 수신 동의 여부',
    email_verified bit not null comment '이메일 인증 여부',
    is_active bit not null comment '활성 여부',
    last_attendance_date date comment '마지막 출석 일자',
    maturing_power integer not null comment '숙성력(보유 점수)',
    must_change_password bit not null comment '비밀번호 변경 필요 여부',
    nickname_fixed bit not null comment '닉네임 고정(변경 불가) 여부',
    adult_verified_at datetime(6) comment '성인인증 완료 일시',
    adult_verify_expires_at datetime(6) comment '성인인증 만료 일시',
    created_at datetime(6) not null comment '생성 일시',
    deleted_at datetime(6) comment '삭제 일시(소프트삭제/탈퇴)',
    dormant_at datetime(6) comment '휴면 전환 일시',
    id bigint not null auto_increment comment 'PK',
    last_login_at datetime(6) comment '마지막 로그인 일시',
    nickname varchar(8) not null comment '닉네임',
    nickname_changed_at datetime(6) comment '닉네임 변경 일시',
    password_changed_at datetime(6) comment '비밀번호 변경 일시',
    privacy_agreed_at datetime(6) comment '개인정보 처리방침 동의 일시',
    producer_id bigint comment '소속 생산자(producer.id, 파트너)',
    profile_image_changed_at datetime(6) comment '프로필 이미지 변경 일시',
    role_type_id bigint comment '역할(role_types.id)',
    suspended_until datetime(6) comment '정지 해제 일시',
    terms_agreed_at datetime(6) comment '이용약관 동의 일시',
    updated_at datetime(6) not null comment '수정 일시',
    privacy_agreed_version varchar(50) comment '동의한 개인정보 처리방침 버전',
    terms_agreed_version varchar(50) comment '동의한 이용약관 버전',
    profile_image_url varchar(500) comment '프로필 이미지 URL',
    suspend_reason varchar(500) comment '정지 사유',
    email varchar(255) not null comment '이메일(로그인 ID)',
    password varchar(255) comment '비밀번호 해시',
    adult_verify_method enum ('MOBILE','SELF','SOCIAL') comment '성인인증 방식 — SELF/MOBILE/SOCIAL',
    role enum ('ADMIN','MEMBER','MODERATOR','PARTNER','SUPER_ADMIN') not null comment '권한 — SUPER_ADMIN/ADMIN/MODERATOR/PARTNER/MEMBER',
    signup_method enum ('EMAIL','GOOGLE','NAVER') not null comment '가입 경로 — EMAIL/NAVER/GOOGLE',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='회원';

create table wishlist (
    created_at datetime(6) not null comment '생성 일시',
    id bigint not null auto_increment comment 'PK',
    spirit_id bigint not null comment '주류(spirit.id)',
    updated_at datetime(6) not null comment '수정 일시',
    user_id bigint not null comment '사용자(users.id)',
    type enum ('COLLECTION') not null comment '유형 — COLLECTION',
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='위시리스트';

-- -----------------------------------------------------------------------------
-- 인덱스 · 제약조건 (UNIQUE / FK)
-- -----------------------------------------------------------------------------
create index idx_admin_log_type on admin_logs (log_type);
create index idx_admin_log_actor on admin_logs (actor_id);
create index idx_admin_log_created_at on admin_logs (created_at);
create index idx_attendance_user_date on attendance_logs (user_id, attendance_date);
alter table attendance_logs add constraint uk_attendance_user_date unique (user_id, attendance_date);
alter table bad_words add constraint UKmmqb0fwtl8rfc8fqn4qgotja6 unique (word);
create index idx_banner_image_banner_id on banner_images (banner_id);
create index idx_banner_image_is_used on banner_images (is_used);
create index idx_banner_image_uploaded_by_id on banner_images (uploaded_by_id);
create index idx_banner_sort_order on banners (sort_order);
create index idx_banner_is_visible on banners (is_visible);
create index idx_banner_language on banners (language);
create index idx_bc_byob on byob_comments (byob_id);
create index idx_bc_participant on byob_comments (participant_user_id);
create index idx_bp_byob on byob_participants (byob_id);
create index idx_bp_user on byob_participants (user_id);
create index idx_bp_status on byob_participants (status);
create index idx_byob_status on byobs (status);
create index idx_byob_host on byobs (host_id);
create index idx_byob_pinned on byobs (is_pinned);
create index idx_event_start_date on calendar_events (start_date);
create index idx_event_end_date on calendar_events (end_date);
create index idx_event_is_visible on calendar_events (is_visible);
create index idx_emoji_reaction_target on comment_emoji_reactions (target_type, target_id);
alter table comment_emoji_reactions add constraint uk_emoji_reaction_target_emoji_user unique (target_type, target_id, emoji_id, user_id);
create index idx_comment_like_user_id on comment_like (user_id);
alter table comment_like add constraint uk_comment_like_comment_user unique (comment_id, user_id);
create index idx_comment_spirit_id on community_comment (spirit_id);
create index idx_comment_user_id on community_comment (user_id);
create index idx_comment_parent_id on community_comment (parent_id);
alter table community_emojis add constraint UK6j1ahknnoyghpyjgreoqli3ga unique (code);
create index idx_content_draft_user_key on content_draft (user_id, draft_key);
create index idx_deal_posts_status on deal_posts (status);
create index idx_deal_posts_created_at on deal_posts (created_at);
alter table deal_posts add constraint uk_deal_posts_source_url unique (source_url);
create index idx_email_recipient_log on email_send_recipients (log_id);
create index idx_faq_language on faqs (language);
create index idx_faq_category on faqs (category);
create index idx_faq_sort_order on faqs (sort_order);
create index idx_feedback_author on feedback (author_id);
create index idx_feedback_status on feedback (status);
create index idx_feedback_created_at on feedback (created_at);
create index idx_feedback_comment_feedback on feedback_comment (feedback_id);
create index idx_inquiry_status on inquiry (status);
create index idx_inquiry_category on inquiry (category);
create index idx_inquiry_created_at on inquiry (created_at);
create index idx_legal_type_active on legal_documents (type, is_active);
alter table member_level_config add constraint UKl27mrv9y7wuhkrpw81w1efdii unique (level);
alter table nickname_bad_words add constraint UKstecqth6qqwjlp8n7k658ncb1 unique (word);
create index idx_notice_category on notice (category);
create index idx_notice_author_id on notice (author_id);
create index idx_notice_is_published on notice (is_published);
create index idx_notice_is_pinned on notice (is_pinned);
create index idx_notice_image_notice_id on notice_image (notice_id);
create index idx_notice_image_uploaded_by_id on notice_image (uploaded_by_id);
create index idx_notice_image_is_used on notice_image (is_used);
create index idx_notice_recommend_notice_id on notice_recommend (notice_id);
alter table notice_recommend add constraint uk_notice_recommend_notice_user unique (notice_id, user_id);
create index idx_notification_recipient_read_created on notifications (recipient_id, is_read, created_at);
alter table poll_votes add constraint uk_poll_vote_poll_option_user unique (poll_id, option_id, user_id);
create index idx_popup_image_popup_id on popup_images (popup_id);
create index idx_popup_image_is_used on popup_images (is_used);
create index idx_popup_image_uploaded_by_id on popup_images (uploaded_by_id);
create index idx_popup_sort_order on popups (sort_order);
create index idx_popup_is_visible on popups (is_visible);
create index idx_popup_display_page_language on popups (display_page, language);
create index idx_comment_post_id on post_comments (post_id);
alter table post_likes add constraint uk_post_like_post_user unique (post_id, user_id);
alter table post_reports add constraint uk_post_report_post_reporter unique (post_id, reporter_id);
alter table post_reports add constraint uk_post_report_comment_reporter unique (comment_id, reporter_id);
alter table post_scraps add constraint uk_post_scrap_post_user unique (post_id, user_id);
create index idx_post_board_type on posts (board_type);
create index idx_post_status on posts (status);
create index idx_post_board_pinned on posts (board_type, is_pinned);
alter table price_alerts add constraint uq_price_alert_user_spirit unique (user_id, spirit_id);
alter table price_report_reports add constraint uq_price_report_report_user unique (price_report_id, reporter_id);
create index idx_price_report_spirit_status_purchased on price_reports (spirit_id, status, purchased_at);
create index idx_producer_req_user_id on producer_register_request (user_id);
create index idx_producer_req_status on producer_register_request (status);
create index idx_report_target on report (target_type, target_id);
create index idx_report_reporter_id on report (reporter_id);
create index idx_report_status on report (status);
create index idx_review_spirit_id on review (spirit_id);
create index idx_review_user_id on review (user_id);
alter table score_config add constraint UKs9tikmlq8uw67leg8igj099p9 unique (action_type);
create index idx_score_history_user_created on score_history (user_id, created_at);
create index idx_score_history_user_action_created on score_history (user_id, action_type, created_at);
create index idx_spirit_category on spirit (category);
create index idx_spirit_status on spirit (status);
create index idx_spirit_producer_id on spirit (producer_id);
create index idx_spirit_image_spirit_id on spirit_image (spirit_id);
create index idx_spirit_req_user_id on spirit_register_request (user_id);
create index idx_spirit_req_status on spirit_register_request (status);
create index idx_spirit_variant_link_spirit on spirit_variant_link (spirit_id);
create index idx_spirit_variant_link_related on spirit_variant_link (related_spirit_id);
alter table spirit_variant_link add constraint uk_spirit_variant_link_pair unique (spirit_id, related_spirit_id);
create index idx_wine_vintage on spirit_wine_detail (vintage);
create index idx_store_alias_alias on store_aliases (alias);
create index idx_store_display_name on stores (display_name);
create index idx_store_is_approved on stores (is_approved);
alter table user_blocks add constraint uk_user_block_blocker_blocked unique (blocker_id, blocked_id);
create index idx_user_bottle_user_id on user_bottle (user_id);
create index idx_user_bottle_user_category on user_bottle (user_id, category);
create index idx_user_bottle_user_public on user_bottle (user_id, is_public);
create index idx_user_social_user on user_social_account (user_id);
alter table user_social_account add constraint uk_user_social_provider unique (provider, provider_user_id);
create index idx_user_email on users (email);
alter table users add constraint UK6dotkott2kjsp8vw4d0m25fb7 unique (email);
create index idx_wishlist_user_id on wishlist (user_id);
create index idx_wishlist_spirit_id on wishlist (spirit_id);
alter table wishlist add constraint uk_wishlist_user_spirit_type unique (user_id, spirit_id, type);
alter table admin_logs add constraint FKg2l1052y2vep295mm4su4yrnq foreign key (actor_id) references users (id);
alter table attendance_logs add constraint FKagvi0aj6qk90ch4ecipkckmw6 foreign key (user_id) references users (id);
alter table banner_images add constraint FK633x0a6l0tvcjj7xoeaivj92t foreign key (banner_id) references banners (id);
alter table banner_images add constraint FKjynrcn3hdmrbet4q9lt31q4dv foreign key (uploaded_by_id) references users (id);
alter table banners add constraint FK28kfmy86jolmciytu5w6kuj3h foreign key (created_by_id) references users (id);
alter table byob_comments add constraint FK40a750hdauvltnn3haa5d9a1j foreign key (author_id) references users (id);
alter table byob_comments add constraint FK692f2ur9fg35jfn0goevje5m9 foreign key (byob_id) references byobs (id);
alter table byob_comments add constraint FKd96c2euv43goephfdo0pfq9dg foreign key (participant_user_id) references users (id);
alter table byob_host_bottles add constraint FKo3tooogvdwv3scbk1isr1tixl foreign key (byob_id) references byobs (id);
alter table byob_participants add constraint FK8jh0gn4dag22fkg32b5nw2q5b foreign key (byob_id) references byobs (id);
alter table byob_participants add constraint FK1nil6dkfb7h5mmx9gvgqjpvwr foreign key (spirit_id) references spirit (id);
alter table byob_participants add constraint FK2ttw8fy06u5bvv75huy7yttpx foreign key (user_id) references users (id);
alter table byobs add constraint FKm6hw3geulxfv9c0j9ij6qvhsc foreign key (host_id) references users (id);
alter table calendar_events add constraint FK2eu3tcu4pk4s7hjndm2g06gnk foreign key (created_by_id) references users (id);
alter table comment_emoji_reactions add constraint FKk2tl8xyqhqpmeotwfiotjqbvm foreign key (emoji_id) references community_emojis (id);
alter table comment_emoji_reactions add constraint FKow609opkskbuxpsbbwogri7qs foreign key (user_id) references users (id);
alter table comment_like add constraint FKmo6l4wl9r7uoqs242im23h5mc foreign key (comment_id) references community_comment (id);
alter table comment_like add constraint FKl5wrmp8eoy5uegdo3473jqqi foreign key (user_id) references users (id);
alter table community_comment add constraint FKc9mct3uqphyiqyyowu3f406q5 foreign key (parent_id) references community_comment (id);
alter table community_comment add constraint FKprnfm93ll2rdxgjx4aksrt6y5 foreign key (spirit_id) references spirit (id);
alter table community_comment add constraint FKs9gc75wej6pldfjq4rfhioqli foreign key (user_id) references users (id);
alter table community_emojis add constraint FK64cci7sefal9jmvcwvw16frw0 foreign key (group_id) references emoji_groups (id);
alter table content_draft add constraint FKimv514gnvcsnd88rw75v3o6jl foreign key (user_id) references users (id);
alter table email_send_recipients add constraint FKnr5ijo12x5n7qprysgpawk622 foreign key (log_id) references email_send_logs (id);
alter table feedback add constraint FKngpj3yee28en2reje1c92htwe foreign key (author_id) references users (id);
alter table feedback_comment add constraint FKbuetoq1cuxj3vbkks9jet3o2n foreign key (author_id) references users (id);
alter table feedback_comment add constraint FK5gskomf0lx10q9bu9s7eio5q0 foreign key (feedback_id) references feedback (id);
alter table legal_documents add constraint FK2teauutx3tmeph4dtl5ql2g3a foreign key (author_id) references users (id);
alter table message_items add constraint FKnbrjt863o9ifjbxugtimjmumq foreign key (message_id) references messages (id);
alter table message_items add constraint FKpmxrklv9m9powj2vd9qd22tcx foreign key (sender_id) references users (id);
alter table messages add constraint FKt05r0b6n0iis8u7dfna4xdh73 foreign key (receiver_id) references users (id);
alter table messages add constraint FK4ui4nnwntodh6wjvck53dbk9m foreign key (sender_id) references users (id);
alter table notice add constraint FKgib4imoxg1fihk96xdsgmu51o foreign key (author_id) references users (id);
alter table notice_image add constraint FK13h2d99jqpw7xnaj5w1crvv8m foreign key (notice_id) references notice (id);
alter table notice_image add constraint FK2wcxcg4i8l2ai1o95khhhpdor foreign key (uploaded_by_id) references users (id);
alter table notice_recommend add constraint FK59y2evpo3g9thijih7cl419jx foreign key (notice_id) references notice (id);
alter table notice_recommend add constraint FKf3j87d2qn94xprhv1p39s5c9b foreign key (user_id) references users (id);
alter table notifications add constraint FKqqnsjxlwleyjbxlmm213jaj3f foreign key (recipient_id) references users (id);
alter table poll_options add constraint FK1baxdjoxricfu0grc0j6821f7 foreign key (poll_id) references polls (id);
alter table poll_votes add constraint FK974fgfa4183h12b8vns9226qs foreign key (option_id) references poll_options (id);
alter table poll_votes add constraint FKmaogo469u92y072mev488em6p foreign key (poll_id) references polls (id);
alter table poll_votes add constraint FK3q0e7cabgif9f1t7voom07bg5 foreign key (user_id) references users (id);
alter table polls add constraint FK7lb5nmwvqxek882fm7b1oiusf foreign key (id) references posts (id);
alter table popup_images add constraint FKjn8pobsalv47bysuru6w8ppgv foreign key (popup_id) references popups (id);
alter table popup_images add constraint FK3ynwhfs7836eo1bodthg594fi foreign key (uploaded_by_id) references users (id);
alter table popups add constraint FKjs4kjll1b3wlxbdaspl5rh0qy foreign key (created_by_id) references users (id);
alter table post_comments add constraint FK9uedrlupih4x9c9qk1ntwdpie foreign key (author_id) references users (id);
alter table post_comments add constraint FKc3b7s6wypcsvua2ycn4o1lv2c foreign key (parent_id) references post_comments (id);
alter table post_comments add constraint FKaawaqxjs3br8dw5v90w7uu514 foreign key (post_id) references posts (id);
alter table post_images add constraint FKo1i5va2d8de9mwq727vxh0s05 foreign key (post_id) references posts (id);
alter table post_images add constraint FK7cwb5w3hey95n07ohs3dugxal foreign key (uploaded_by_id) references users (id);
alter table post_likes add constraint FKa5wxsgl4doibhbed9gm7ikie2 foreign key (post_id) references posts (id);
alter table post_likes add constraint FKkgau5n0nlewg6o9lr4yibqgxj foreign key (user_id) references users (id);
alter table post_reports add constraint FKm5v2ewbmla1wmgaeldmm3yf9g foreign key (comment_id) references post_comments (id);
alter table post_reports add constraint FK7ccpkj5jys037f9pq98l31ya2 foreign key (post_id) references posts (id);
alter table post_reports add constraint FKqi5fmh45u32i63971en0rmrvo foreign key (reporter_id) references users (id);
alter table post_scraps add constraint FKp8dj37oryhvcnh85n6dfde7qp foreign key (post_id) references posts (id);
alter table post_scraps add constraint FKbbttblkn4q7155ey1nl0dn57j foreign key (user_id) references users (id);
alter table post_videos add constraint FKkvd93fd0j8e7e8xvtulyhr58d foreign key (post_id) references posts (id);
alter table post_videos add constraint FK9s20d953ss1p5gk1r6x7coh8l foreign key (uploaded_by_id) references users (id);
alter table posts add constraint FK6xvn0811tkyo3nfjk2xvqx6ns foreign key (author_id) references users (id);
alter table posts add constraint FKljl6fuuilf616niagktykbpe7 foreign key (distillery_tag_id) references producer (id);
alter table posts add constraint FKd74ydhsrvvhe00xte1jt02xkf foreign key (prefix_id) references post_prefixes (id);
alter table posts add constraint FKrpl8opijphnmefnx6adplhe90 foreign key (series_id) references series (id);
alter table price_alerts add constraint FKg679b1j3vp8j2m68naqxgfy6p foreign key (spirit_id) references spirit (id);
alter table price_alerts add constraint FKaqq01qkath6ujf2ikwey10q8l foreign key (user_id) references users (id);
alter table price_discount_items add constraint FKmmprdj7kb3ftsgxp2hjnxt2ka foreign key (price_report_id) references price_reports (id);
alter table price_report_images add constraint FKjq43724wotxwiy6sqgcm60rmt foreign key (price_report_id) references price_reports (id);
alter table price_report_images add constraint FK4h1b6yn1oxuufuoqexebanfqy foreign key (uploaded_by_id) references users (id);
alter table price_report_reports add constraint FK18jbtbx1aaff5e6fb83jdlh6i foreign key (price_report_id) references price_reports (id);
alter table price_report_reports add constraint FKj3std86pgpw3wufoqi50k7ld2 foreign key (reporter_id) references users (id);
alter table price_report_reports add constraint FKasah0ymu3nr86ss5t9xyxhljq foreign key (resolved_by_id) references users (id);
alter table price_reports add constraint FKtnpwgnimivc4lw5ld6vhrfqen foreign key (approved_by_id) references users (id);
alter table price_reports add constraint FKnli87d72bw0amuja6r888ro6a foreign key (reporter_id) references users (id);
alter table price_reports add constraint FKox8upavdcvbf6rpyswnx3buqj foreign key (spirit_id) references spirit (id);
alter table price_reports add constraint FKjpq5ba4ui1356v1n4o4xah4wj foreign key (store_id) references stores (id);
alter table producer_register_request add constraint FKbwvu6onqmusqdv8xmbqf0weby foreign key (reviewed_by_id) references users (id);
alter table producer_register_request add constraint FKlmjqit563slgq484scwanufg4 foreign key (user_id) references users (id);
alter table report add constraint FKqbhdxqd3ly7fkhly5nrl2j93k foreign key (reporter_id) references users (id);
alter table review add constraint FKqdex5xsdnmbd4iitj82uol9x0 foreign key (spirit_id) references spirit (id);
alter table review add constraint FK6cpw2nlklblpvc7hyt7ko6v3e foreign key (user_id) references users (id);
alter table role_type_allowed_menus add constraint FK4aquc3srfudqeipwk5paj5pm5 foreign key (role_type_id) references role_types (id);
alter table score_history add constraint FKhd7knvy68f2ns4d0umdsuv43l foreign key (user_id) references users (id);
alter table series add constraint FKl1a8bepia7402bf9jqg1bge1j foreign key (author_id) references users (id);
alter table spirit add constraint FKa1jbstotx23d1i602e4mc926r foreign key (producer_id) references producer (id);
alter table spirit add constraint FKk2iuytacfdlwe7fu9047pnhii foreign key (registered_by_id) references users (id);
alter table spirit_cognac_detail add constraint FKrnsctmhsnh9w93n8noncibqsf foreign key (spirit_id) references spirit (id);
alter table spirit_common_detail add constraint FKcsfcguef90nua28oju8m33glx foreign key (spirit_id) references spirit (id);
alter table spirit_image add constraint FK9wgcumw69uo6anvje0rw4vd89 foreign key (spirit_id) references spirit (id);
alter table spirit_other_detail add constraint FKlnq9e3sh4es10y9nhfdakt6xw foreign key (spirit_id) references spirit (id);
alter table spirit_register_request add constraint FKthh9q63k7qs07sf8oiqxgik9 foreign key (reviewed_by_id) references users (id);
alter table spirit_register_request add constraint FK7vtcwmey108rh4gir70ny5wgm foreign key (user_id) references users (id);
alter table spirit_whisky_detail add constraint FK2emism78jobp8qg3ixwiodavn foreign key (spirit_id) references spirit (id);
alter table spirit_wine_detail add constraint FKsjj32g1oyww5js3o4nm6u3720 foreign key (spirit_id) references spirit (id);
alter table store_aliases add constraint FKh06hn8akgydgjiil5a1hr8wiy foreign key (store_id) references stores (id);
alter table stores add constraint FK926rba6w5atw7qhggb5fxupun foreign key (approved_by_id) references users (id);
alter table stores add constraint FKlp38jjdmwh1gfsjat43v5vqa2 foreign key (created_by_id) references users (id);
alter table user_blocks add constraint FK7k3mfgb03bnmwh81vqb1u5h80 foreign key (blocked_id) references users (id);
alter table user_blocks add constraint FKgvu85oyjrfafwttb7iphgmm0v foreign key (blocker_id) references users (id);
alter table user_board_permissions add constraint FKsxdxauvdu3p8ws329a2ijd07u foreign key (user_id) references users (id);
alter table user_bottle add constraint FK4wia3pvcs9v9rq522b88sqlw7 foreign key (spirit_id) references spirit (id);
alter table user_bottle add constraint FKfka2pqj1eo2us61nepheefli2 foreign key (user_id) references users (id);
alter table user_bottle_image add constraint FKfcamqbpye3lnokswjuq426ly2 foreign key (user_bottle_id) references user_bottle (id);
alter table user_social_account add constraint FK998rgv7jn090iyc77f8e1xsnq foreign key (user_id) references users (id);
alter table users add constraint FKst1plmwt6pwpravmhtba7b9gg foreign key (producer_id) references producer (id);
alter table users add constraint FKb7edkxkb2uwj3erltmbdux9r7 foreign key (role_type_id) references role_types (id);
alter table wishlist add constraint FKflg9pjdq904wwuf1n9suud5c6 foreign key (spirit_id) references spirit (id);
alter table wishlist add constraint FKtrd6335blsefl2gxpb8lr0gr7 foreign key (user_id) references users (id);
