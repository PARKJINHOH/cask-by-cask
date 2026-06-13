-- =============================================================================
-- CaskByCask 초기 스키마 베이스라인 (클린 베이스라인)
-- =============================================================================
-- 생성 기준일: 2026-06-05
-- 생성 방식: 현재 JPA 엔티티 전체로부터 Hibernate(MariaDBDialect)가 생성한 DDL 을
--           그대로 사용. (SchemaDumpTest 로 추출 → 각 테이블 utf8mb4 charset 부여)
--
-- [정책]
--   - Flyway 가 스키마 + 기초데이터(seed)를 모두 소유합니다.
--   - local/dev : ddl-auto=validate (스키마는 Flyway 가 만들고 Hibernate 는 검증만)
--   - prod      : ddl-auto=none
--   - 엔티티 스키마를 변경하면 반드시 V{n}__*.sql 마이그레이션을 추가하세요.
--     (local 에서 빠른 반복이 필요하면 일시적으로 ddl-auto=update 로 전환 가능)
--
-- [주의]
--   - 한 번 적용된 후에는 이 파일을 수정하지 마세요. (Flyway 체크섬 검증으로 기동이 막힘)
-- =============================================================================

    create table admin_logs (
        actor_id bigint not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        target_id bigint not null,
        summary varchar(500) not null,
        detail TEXT,
        log_type enum ('ACCOUNT_DELETE','ACCOUNT_SUSPEND','CONTENT_HIDE','CONTENT_RESTORE','ROLE_CHANGE') not null,
        target_type enum ('COMMENT','POST','USER') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table attendance_logs (
        attendance_date date not null,
        streak_count integer not null,
        id bigint not null auto_increment,
        user_id bigint not null,
        bonus_awarded enum ('NONE','STREAK_30','STREAK_7') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table bad_words (
        is_active bit not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        word varchar(100) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table banner_images (
        is_used bit not null,
        banner_id bigint,
        created_at datetime(6) not null,
        file_size bigint not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        uploaded_by_id bigint not null,
        mime_type varchar(100) not null,
        sub_path varchar(100) not null,
        image_url varchar(500) not null,
        original_file_name varchar(255) not null,
        saved_file_name varchar(255) not null,
        image_type enum ('MO','PC') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table banners (
        is_always_visible bit not null,
        is_visible bit not null,
        link_target_blank bit not null,
        sort_order integer not null,
        created_at datetime(6) not null,
        created_by_id bigint not null,
        end_at datetime(6),
        id bigint not null auto_increment,
        start_at datetime(6),
        updated_at datetime(6) not null,
        admin_title varchar(200) not null,
        link_url varchar(500),
        content LONGTEXT,
        content_sanitized LONGTEXT,
        banner_type enum ('HTML','IMAGE') not null,
        language enum ('EN','KO') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table byob_comments (
        author_id bigint not null,
        byob_id bigint not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        parent_id bigint,
        participant_user_id bigint not null,
        updated_at datetime(6) not null,
        content varchar(200) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table byob_host_bottles (
        byob_id bigint not null,
        bottle_name varchar(100) not null
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table byob_participants (
        applied_at datetime(6) not null,
        byob_id bigint not null,
        id bigint not null auto_increment,
        spirit_id bigint,
        user_id bigint not null,
        memo varchar(200),
        removed_reason varchar(300),
        bottle_name varchar(500) not null,
        status enum ('APPROVED','PENDING','REJECTED','REMOVED') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table byobs (
        approved_count integer not null,
        max_participants integer not null,
        pending_count integer not null,
        created_at datetime(6) not null,
        event_at datetime(6) not null,
        host_id bigint not null,
        id bigint not null auto_increment,
        linked_free_post_id bigint,
        recruit_end_at datetime(6) not null,
        recruit_start_at datetime(6) not null,
        updated_at datetime(6) not null,
        location varchar(100) not null,
        title varchar(100) not null,
        address varchar(200) not null,
        content TEXT not null,
        status enum ('CANCELLED','CLOSED','OPEN') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table calendar_events (
        end_date date,
        is_visible bit not null,
        start_date date not null,
        created_at datetime(6) not null,
        created_by_id bigint not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        title varchar(200) not null,
        link_url varchar(500),
        description TEXT,
        category enum ('ETC','EVENT','FESTIVAL','RELEASE') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table comment_emoji_reactions (
        created_at datetime(6) not null,
        emoji_id bigint not null,
        id bigint not null auto_increment,
        target_id bigint not null,
        updated_at datetime(6) not null,
        user_id bigint not null,
        target_type enum ('POST_COMMENT','SPIRIT_COMMENT') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table comment_like (
        comment_id bigint not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        user_id bigint not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table community_comment (
        is_hidden bit not null,
        like_count integer not null,
        report_count integer not null,
        created_at datetime(6) not null,
        deleted_at datetime(6),
        id bigint not null auto_increment,
        parent_id bigint,
        spirit_id bigint not null,
        updated_at datetime(6) not null,
        user_id bigint not null,
        content TEXT not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table community_emojis (
        is_active bit not null,
        sort_order integer not null,
        created_at datetime(6) not null,
        group_id bigint,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        unicode varchar(10),
        code varchar(50) not null,
        label varchar(50) not null,
        image_url varchar(500),
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table content_draft (
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        user_id bigint not null,
        draft_key varchar(50) not null,
        title varchar(300),
        content LONGTEXT,
        meta TEXT,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table deleted_posts (
        author_id bigint not null,
        deleted_at datetime(6) not null,
        deleted_by bigint not null,
        id bigint not null auto_increment,
        original_created_at datetime(6) not null,
        original_post_id bigint not null,
        title varchar(300) not null,
        delete_reason varchar(500),
        board_type enum ('FREE','NOTICE') not null,
        content LONGTEXT,
        content_sanitized LONGTEXT,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table email_send_logs (
        fail_count integer not null,
        success_count integer not null,
        total_count integer not null,
        id bigint not null auto_increment,
        sent_at datetime(6) not null,
        subject varchar(300) not null,
        body TEXT not null,
        send_type enum ('BULK','TEST') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table email_send_recipients (
        success bit not null,
        id bigint not null auto_increment,
        log_id bigint,
        nickname varchar(20),
        error_message varchar(500),
        email varchar(255) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table email_templates (
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        name varchar(100) not null,
        subject varchar(300) not null,
        body TEXT not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table emoji_groups (
        is_active bit not null,
        sort_order integer not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        name varchar(50) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table faqs (
        is_active bit not null,
        sort_order integer not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        question varchar(500) not null,
        answer TEXT not null,
        category enum ('COGNAC','SERVICE','WHISKY','WINE') not null,
        language enum ('EN','KO') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table inquiry (
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        replied_at datetime(6),
        updated_at datetime(6) not null,
        replied_by varchar(200),
        sender_email varchar(200) not null,
        title varchar(200) not null,
        admin_note TEXT,
        body TEXT not null,
        image_urls TEXT,
        reply_body TEXT,
        category enum ('ACCOUNT_INQUIRY','BUG_REPORT','CORRECTION_REQUEST','FEATURE_REQUEST','OTHER') not null,
        status enum ('IN_PROGRESS','PENDING','RESOLVED') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table legal_documents (
        is_active bit not null,
        author_id bigint,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        version varchar(50) not null,
        content LONGTEXT not null,
        content_sanitized LONGTEXT not null,
        type enum ('PRIVACY_POLICY','TERMS') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table member_level_config (
        is_active bit not null,
        level integer not null,
        min_score integer not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        name varchar(50) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table message_items (
        is_read bit not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        message_id bigint not null,
        read_at datetime(6),
        sender_id bigint not null,
        updated_at datetime(6) not null,
        content LONGTEXT not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table messages (
        is_deleted_by_receiver bit not null,
        is_deleted_by_sender bit not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        receiver_id bigint not null,
        sender_id bigint not null,
        updated_at datetime(6) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table nickname_bad_words (
        is_active bit not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        word varchar(100) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table notice (
        is_pinned bit not null,
        is_published bit not null,
        author_id bigint not null,
        created_at datetime(6) not null,
        deleted_at datetime(6),
        id bigint not null auto_increment,
        recommend_count bigint not null,
        updated_at datetime(6) not null,
        view_count bigint not null,
        title varchar(300) not null,
        content LONGTEXT not null,
        content_sanitized LONGTEXT not null,
        category enum ('EVENT','GENERAL','MAINTENANCE','UPDATE') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table notice_image (
        is_used bit not null,
        created_at datetime(6) not null,
        file_size bigint not null,
        id bigint not null auto_increment,
        notice_id bigint,
        updated_at datetime(6) not null,
        uploaded_by_id bigint not null,
        mime_type varchar(100) not null,
        sub_path varchar(100) not null,
        image_url varchar(500) not null,
        original_file_name varchar(255) not null,
        saved_file_name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table notice_recommend (
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        notice_id bigint not null,
        updated_at datetime(6) not null,
        user_id bigint not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table notifications (
        is_read bit not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        recipient_id bigint not null,
        target_id bigint,
        target_type varchar(50),
        message varchar(200) not null,
        type enum ('BYOB_APPLY','BYOB_APPROVE','BYOB_REJECT','BYOB_REMOVE','COMMENT','LIKE','MENTION','MESSAGE','PRICE_ALERT','REPLY','REQUEST_APPROVED','REQUEST_REJECTED','SYSTEM') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table poll_options (
        sort_order integer not null,
        vote_count integer not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        poll_id bigint not null,
        updated_at datetime(6) not null,
        option_text varchar(200) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table poll_votes (
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        option_id bigint not null,
        poll_id bigint not null,
        updated_at datetime(6) not null,
        user_id bigint not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table polls (
        is_multiple_choice bit not null,
        created_at datetime(6) not null,
        ends_at datetime(6),
        id bigint not null,
        updated_at datetime(6) not null,
        question varchar(300) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table popup_images (
        is_used bit not null,
        created_at datetime(6) not null,
        file_size bigint not null,
        id bigint not null auto_increment,
        popup_id bigint,
        updated_at datetime(6) not null,
        uploaded_by_id bigint not null,
        mime_type varchar(100) not null,
        sub_path varchar(100) not null,
        image_url varchar(500) not null,
        original_file_name varchar(255) not null,
        saved_file_name varchar(255) not null,
        image_type enum ('CONTENT','MAIN') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table popups (
        close_on_overlay bit not null,
        is_always_visible bit not null,
        is_visible bit not null,
        link_target_blank bit not null,
        sort_order integer not null,
        created_at datetime(6) not null,
        created_by_id bigint not null,
        end_at datetime(6),
        id bigint not null auto_increment,
        start_at datetime(6),
        updated_at datetime(6) not null,
        admin_title varchar(200) not null,
        link_url varchar(500),
        content LONGTEXT,
        content_sanitized LONGTEXT,
        display_page enum ('MAIN') not null,
        language enum ('EN','KO') not null,
        popup_type enum ('HTML','IMAGE') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table post_comments (
        is_anonymous bit not null,
        is_hidden bit not null,
        report_count integer not null,
        author_id bigint not null,
        created_at datetime(6) not null,
        deleted_at datetime(6),
        id bigint not null auto_increment,
        mentioned_user_id bigint,
        parent_id bigint,
        post_id bigint,
        updated_at datetime(6) not null,
        content LONGTEXT not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table post_images (
        is_used bit not null,
        created_at datetime(6) not null,
        file_size bigint not null,
        id bigint not null auto_increment,
        post_id bigint,
        updated_at datetime(6) not null,
        uploaded_by_id bigint not null,
        mime_type varchar(100) not null,
        image_url varchar(500) not null,
        original_file_name varchar(255) not null,
        saved_file_name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table post_likes (
        is_like bit not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        post_id bigint not null,
        updated_at datetime(6) not null,
        user_id bigint not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table post_prefixes (
        is_active bit not null,
        sort_order integer not null,
        color_hex varchar(7),
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        name varchar(20) not null,
        board_type enum ('FREE','NOTICE') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table post_reports (
        comment_id bigint,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        post_id bigint,
        reporter_id bigint not null,
        resolved_at datetime(6),
        updated_at datetime(6) not null,
        reason varchar(500),
        status enum ('DISMISSED','PENDING','RESOLVED') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table post_scraps (
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        post_id bigint not null,
        updated_at datetime(6) not null,
        user_id bigint not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table posts (
        comment_count integer not null,
        is_anonymous bit not null,
        is_hidden bit not null,
        like_count integer not null,
        report_count integer not null,
        series_order integer,
        author_id bigint not null,
        created_at datetime(6) not null,
        distillery_tag_id bigint,
        id bigint not null auto_increment,
        prefix_id bigint,
        series_id bigint,
        updated_at datetime(6) not null,
        view_count bigint not null,
        title varchar(300) not null,
        board_type enum ('FREE','NOTICE') not null,
        content LONGTEXT not null,
        content_sanitized LONGTEXT not null,
        status enum ('ACTIVE','DELETED','LOCKED') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table price_alerts (
        is_active bit not null,
        target_price_krw decimal(12,0),
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        last_notified_at datetime(6),
        spirit_id bigint not null,
        updated_at datetime(6) not null,
        user_id bigint not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table price_discount_items (
        discount_amount decimal(12,0) not null,
        id bigint not null auto_increment,
        price_report_id bigint not null,
        description varchar(200),
        discount_type enum ('BUNDLE','COUPON','OTHER','PAYMENT') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table price_report_images (
        is_public bit not null,
        sort_order integer not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        price_report_id bigint,
        updated_at datetime(6) not null,
        uploaded_by_id bigint not null,
        mime_type varchar(50) not null,
        sub_path varchar(100) not null,
        image_url varchar(500) not null,
        original_file_name varchar(255),
        saved_file_name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table price_report_reports (
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        price_report_id bigint not null,
        reporter_id bigint not null,
        resolved_at datetime(6),
        resolved_by_id bigint,
        updated_at datetime(6) not null,
        reason_detail varchar(500),
        reason enum ('BAD_IMAGE','DUPLICATE','FALSE_PRICE','OTHER') not null,
        status enum ('DISMISSED','PENDING','RESOLVED') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table price_reports (
        actual_price decimal(12,0),
        auto_flagged bit not null,
        exchange_rate_snapshot decimal(10,4),
        is_anonymous bit not null,
        is_verified bit not null,
        payback_amount decimal(12,0),
        price decimal(12,0),
        purchased_at date,
        report_count integer not null,
        sale_price decimal(12,0),
        approved_at datetime(6),
        approved_by_id bigint,
        created_at datetime(6) not null,
        deleted_at datetime(6),
        id bigint not null auto_increment,
        rejected_at datetime(6),
        reporter_id bigint,
        spirit_id bigint not null,
        store_id bigint,
        updated_at datetime(6) not null,
        description varchar(500),
        reject_reason varchar(500),
        suggested_store_name varchar(255),
        currency enum ('KRW','USD') not null,
        status enum ('APPROVED','PENDING','REJECTED') not null,
        suggested_dutyfree_channel enum ('AIRPORT','CITY','INFLIGHT','ONLINE'),
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table producer (
        founded_year integer,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        country varchar(100) not null,
        region varchar(100),
        name_en varchar(200) not null,
        name_ko varchar(200) not null,
        website varchar(500),
        description_en TEXT,
        description_ko TEXT,
        type enum ('COGNAC_HOUSE','DISTILLERY','OTHER','WINERY') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table producer_register_request (
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        reviewed_at datetime(6),
        reviewed_by_id bigint,
        updated_at datetime(6) not null,
        user_id bigint not null,
        producer_data TEXT not null,
        reject_reason TEXT,
        status enum ('APPROVED','PENDING','REJECTED') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table report (
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        reporter_id bigint not null,
        resolved_at datetime(6),
        target_id bigint not null,
        updated_at datetime(6) not null,
        reason varchar(500),
        status enum ('DISMISSED','PENDING','RESOLVED') not null,
        target_type enum ('COMMENT','IMAGE','REVIEW') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table review (
        finish_score decimal(4,1) not null,
        is_hidden bit not null,
        nose_score decimal(4,1) not null,
        report_count integer not null,
        taste_score decimal(4,1) not null,
        total_score decimal(4,1) not null,
        created_at datetime(6) not null,
        deleted_at datetime(6),
        id bigint not null auto_increment,
        spirit_id bigint not null,
        updated_at datetime(6) not null,
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
        menu_key enum ('PRODUCER_REQUESTS','PRODUCERS','SPIRITS','SPIRIT_REQUESTS')
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table role_types (
        is_active bit not null,
        sort_order integer not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        name varchar(100) not null,
        description varchar(500),
        system_role enum ('ADMIN','MEMBER','MODERATOR','PARTNER','SUPER_ADMIN') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table score_config (
        daily_limit integer,
        is_active bit not null,
        score integer not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        action_type varchar(50) not null,
        description varchar(200),
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table score_history (
        balance_after integer not null,
        score integer not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        reference_id bigint,
        user_id bigint not null,
        action_type varchar(50) not null,
        reference_type varchar(50),
        description varchar(200),
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table series (
        post_count integer not null,
        author_id bigint not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        title varchar(200) not null,
        description varchar(500),
        board_type enum ('FREE','NOTICE') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table spirit (
        abv decimal(4,1),
        avg_score decimal(4,1),
        bottled_year integer,
        review_count integer not null,
        vintage_year integer,
        volume_ml integer,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        producer_id bigint,
        registered_by_id bigint,
        updated_at datetime(6) not null,
        country varchar(100),
        region varchar(100),
        bottler varchar(200),
        name_en varchar(200) not null,
        name_ko varchar(200) not null,
        category enum ('COGNAC','OTHER','WHISKY','WINE') not null,
        status enum ('ACTIVE','HIDDEN','PENDING') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table spirit_cognac_detail (
        is_fine_champagne bit,
        spirit_id bigint not null,
        extra_data TEXT,
        cru enum ('BONS_BOIS','BORDERIES','FINS_BOIS','GRANDE_CHAMPAGNE','PETITE_CHAMPAGNE'),
        grade enum ('HORS_DAGE','NAPOLEON','VS','VSOP','XO','XXO'),
        primary key (spirit_id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table spirit_common_detail (
        abv decimal(4,1),
        age_statement integer,
        is_nas bit not null,
        release_date date,
        total_bottles integer,
        volume_ml integer,
        bottled_date varchar(7),
        distilled_date varchar(7),
        spirit_id bigint not null,
        bottle_no varchar(50),
        batch_no varchar(100),
        primary key (spirit_id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table spirit_image (
        is_primary bit not null,
        sort_order integer not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        spirit_id bigint not null,
        updated_at datetime(6) not null,
        image_url varchar(500) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table spirit_other_detail (
        spirit_id bigint not null,
        extra_data TEXT,
        other_type enum ('ABSINTHE','BAIJIU','BEER','BRANDY','GIN','LIQUEUR','MEZCAL','OTHER','RUM','SAKE','SOJU','TEQUILA','VODKA'),
        primary key (spirit_id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table spirit_register_request (
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        reviewed_at datetime(6),
        reviewed_by_id bigint,
        updated_at datetime(6) not null,
        user_id bigint not null,
        reject_reason TEXT,
        spirit_data TEXT not null,
        status enum ('APPROVED','PENDING','REJECTED') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table spirit_whisky_detail (
        is_cask_strength bit,
        is_natural_colour bit,
        is_non_chill_filtered bit,
        is_peated bit,
        is_single_cask bit,
        phenol_ppm integer,
        spirit_id bigint not null,
        extra_data TEXT,
        bottling_type enum ('IB','OB'),
        cask_type enum ('EX_BOURBON','EX_COGNAC','EX_MADEIRA','EX_PORT','EX_RUM','EX_SAUTERNES','EX_SHERRY','EX_WINE','MIZUNARA','NEW_OAK','OTHER'),
        finish_cask_type enum ('EX_BOURBON','EX_COGNAC','EX_MADEIRA','EX_PORT','EX_RUM','EX_SAUTERNES','EX_SHERRY','EX_WINE','MIZUNARA','NEW_OAK','OTHER'),
        maturation_style enum ('FINISH','FULL_MATURATION'),
        style enum ('BLENDED_MALT','BLENDED_WHISKY','BOURBON','CORN','GRAIN','POT_STILL','RYE','SINGLE_MALT'),
        primary key (spirit_id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table spirit_wine_detail (
        is_natural_wine bit,
        is_oak_aged bit,
        vintage integer,
        spirit_id bigint not null,
        extra_data TEXT,
        certification enum ('BIODYNAMIC','NONE','ORGANIC','SUSTAINABLE'),
        wine_type enum ('DESSERT','ORANGE','RED','ROSE','SPARKLING','WHITE'),
        primary key (spirit_id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table store_aliases (
        id bigint not null auto_increment,
        store_id bigint not null,
        alias varchar(200) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table stores (
        is_approved bit not null,
        approved_at datetime(6),
        approved_by_id bigint,
        created_at datetime(6) not null,
        created_by_id bigint,
        deleted_at datetime(6),
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        region varchar(100),
        display_name varchar(255) not null,
        dutyfree_channel enum ('AIRPORT','CITY','INFLIGHT','ONLINE'),
        store_type enum ('DOMESTIC','DUTYFREE') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table user_blocks (
        blocked_id bigint not null,
        blocker_id bigint not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        updated_at datetime(6) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table user_board_permissions (
        user_id bigint not null,
        board_type enum ('FREE','NOTICE')
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table user_bottle (
        is_public bit not null,
        price integer not null,
        purchase_date date not null,
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        spirit_id bigint,
        updated_at datetime(6) not null,
        user_id bigint not null,
        batch varchar(100),
        bottling_year varchar(100),
        spirit_name_text varchar(200),
        store varchar(200) not null,
        memo TEXT,
        category enum ('COGNAC','OTHER','WHISKY','WINE') not null,
        status enum ('OPENED','UNOPENED') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table user_bottle_image (
        sort_order integer not null,
        id bigint not null auto_increment,
        user_bottle_id bigint not null,
        image_url varchar(500) not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table users (
        consecutive_attendance integer not null,
        current_level integer not null,
        dormant bit not null,
        email_subscribed bit not null,
        email_verified bit not null,
        is_active bit not null,
        last_attendance_date date,
        maturing_power integer not null,
        must_change_password bit not null,
        nickname_fixed bit not null,
        created_at datetime(6) not null,
        deleted_at datetime(6),
        dormant_at datetime(6),
        id bigint not null auto_increment,
        last_login_at datetime(6),
        nickname varchar(8) not null,
        nickname_changed_at datetime(6),
        password_changed_at datetime(6),
        privacy_agreed_at datetime(6),
        producer_id bigint,
        profile_image_changed_at datetime(6),
        role_type_id bigint,
        suspended_until datetime(6),
        terms_agreed_at datetime(6),
        updated_at datetime(6) not null,
        oauth_provider varchar(50),
        privacy_agreed_version varchar(50),
        terms_agreed_version varchar(50),
        profile_image_url varchar(500),
        suspend_reason varchar(500),
        email varchar(255) not null,
        oauth_id varchar(255),
        password varchar(255),
        role enum ('ADMIN','MEMBER','MODERATOR','PARTNER','SUPER_ADMIN') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create table wishlist (
        created_at datetime(6) not null,
        id bigint not null auto_increment,
        spirit_id bigint not null,
        updated_at datetime(6) not null,
        user_id bigint not null,
        type enum ('COLLECTION') not null,
        primary key (id)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

    create index idx_admin_log_type 
       on admin_logs (log_type);

    create index idx_admin_log_actor 
       on admin_logs (actor_id);

    create index idx_admin_log_created_at 
       on admin_logs (created_at);

    create index idx_attendance_user_date 
       on attendance_logs (user_id, attendance_date);

    alter table attendance_logs 
       add constraint uk_attendance_user_date unique (user_id, attendance_date);

    alter table bad_words 
       add constraint UKmmqb0fwtl8rfc8fqn4qgotja6 unique (word);

    create index idx_banner_image_banner_id 
       on banner_images (banner_id);

    create index idx_banner_image_is_used 
       on banner_images (is_used);

    create index idx_banner_image_uploaded_by_id 
       on banner_images (uploaded_by_id);

    create index idx_banner_sort_order 
       on banners (sort_order);

    create index idx_banner_is_visible 
       on banners (is_visible);

    create index idx_banner_language 
       on banners (language);

    create index idx_bc_byob 
       on byob_comments (byob_id);

    create index idx_bc_participant 
       on byob_comments (participant_user_id);

    create index idx_bp_byob 
       on byob_participants (byob_id);

    create index idx_bp_user 
       on byob_participants (user_id);

    create index idx_bp_status 
       on byob_participants (status);

    create index idx_byob_status 
       on byobs (status);

    create index idx_byob_host 
       on byobs (host_id);

    create index idx_event_start_date 
       on calendar_events (start_date);

    create index idx_event_end_date 
       on calendar_events (end_date);

    create index idx_event_is_visible 
       on calendar_events (is_visible);

    create index idx_emoji_reaction_target 
       on comment_emoji_reactions (target_type, target_id);

    alter table comment_emoji_reactions 
       add constraint uk_emoji_reaction_target_emoji_user unique (target_type, target_id, emoji_id, user_id);

    create index idx_comment_like_user_id 
       on comment_like (user_id);

    alter table comment_like 
       add constraint uk_comment_like_comment_user unique (comment_id, user_id);

    create index idx_comment_spirit_id 
       on community_comment (spirit_id);

    create index idx_comment_user_id 
       on community_comment (user_id);

    create index idx_comment_parent_id 
       on community_comment (parent_id);

    alter table community_emojis 
       add constraint UK6j1ahknnoyghpyjgreoqli3ga unique (code);

    create index idx_content_draft_user_key 
       on content_draft (user_id, draft_key);

    create index idx_email_recipient_log 
       on email_send_recipients (log_id);

    create index idx_faq_language 
       on faqs (language);

    create index idx_faq_category 
       on faqs (category);

    create index idx_faq_sort_order 
       on faqs (sort_order);

    create index idx_inquiry_status 
       on inquiry (status);

    create index idx_inquiry_category 
       on inquiry (category);

    create index idx_inquiry_created_at 
       on inquiry (created_at);

    create index idx_legal_type_active 
       on legal_documents (type, is_active);

    alter table member_level_config 
       add constraint UKl27mrv9y7wuhkrpw81w1efdii unique (level);

    alter table nickname_bad_words 
       add constraint UKstecqth6qqwjlp8n7k658ncb1 unique (word);

    create index idx_notice_category 
       on notice (category);

    create index idx_notice_author_id 
       on notice (author_id);

    create index idx_notice_is_published 
       on notice (is_published);

    create index idx_notice_is_pinned 
       on notice (is_pinned);

    create index idx_notice_image_notice_id 
       on notice_image (notice_id);

    create index idx_notice_image_uploaded_by_id 
       on notice_image (uploaded_by_id);

    create index idx_notice_image_is_used 
       on notice_image (is_used);

    create index idx_notice_recommend_notice_id 
       on notice_recommend (notice_id);

    alter table notice_recommend 
       add constraint uk_notice_recommend_notice_user unique (notice_id, user_id);

    create index idx_notification_recipient_read_created 
       on notifications (recipient_id, is_read, created_at);

    alter table poll_votes 
       add constraint uk_poll_vote_poll_option_user unique (poll_id, option_id, user_id);

    create index idx_popup_image_popup_id 
       on popup_images (popup_id);

    create index idx_popup_image_is_used 
       on popup_images (is_used);

    create index idx_popup_image_uploaded_by_id 
       on popup_images (uploaded_by_id);

    create index idx_popup_sort_order 
       on popups (sort_order);

    create index idx_popup_is_visible 
       on popups (is_visible);

    create index idx_popup_display_page_language 
       on popups (display_page, language);

    create index idx_comment_post_id 
       on post_comments (post_id);

    alter table post_likes 
       add constraint uk_post_like_post_user unique (post_id, user_id);

    alter table post_reports 
       add constraint uk_post_report_post_reporter unique (post_id, reporter_id);

    alter table post_reports 
       add constraint uk_post_report_comment_reporter unique (comment_id, reporter_id);

    alter table post_scraps 
       add constraint uk_post_scrap_post_user unique (post_id, user_id);

    create index idx_post_board_type 
       on posts (board_type);

    create index idx_post_status 
       on posts (status);

    alter table price_alerts 
       add constraint uq_price_alert_user_spirit unique (user_id, spirit_id);

    alter table price_report_reports 
       add constraint uq_price_report_report_user unique (price_report_id, reporter_id);

    create index idx_price_report_spirit_status_purchased 
       on price_reports (spirit_id, status, purchased_at);

    create index idx_producer_req_user_id 
       on producer_register_request (user_id);

    create index idx_producer_req_status 
       on producer_register_request (status);

    create index idx_report_target 
       on report (target_type, target_id);

    create index idx_report_reporter_id 
       on report (reporter_id);

    create index idx_report_status 
       on report (status);

    create index idx_review_spirit_id 
       on review (spirit_id);

    create index idx_review_user_id 
       on review (user_id);

    alter table score_config 
       add constraint UKs9tikmlq8uw67leg8igj099p9 unique (action_type);

    create index idx_score_history_user_created 
       on score_history (user_id, created_at);

    create index idx_score_history_user_action_created 
       on score_history (user_id, action_type, created_at);

    create index idx_spirit_category 
       on spirit (category);

    create index idx_spirit_status 
       on spirit (status);

    create index idx_spirit_producer_id 
       on spirit (producer_id);

    create index idx_spirit_image_spirit_id 
       on spirit_image (spirit_id);

    create index idx_spirit_req_user_id 
       on spirit_register_request (user_id);

    create index idx_spirit_req_status 
       on spirit_register_request (status);

    create index idx_wine_vintage 
       on spirit_wine_detail (vintage);

    create index idx_store_alias_alias 
       on store_aliases (alias);

    create index idx_store_display_name 
       on stores (display_name);

    create index idx_store_is_approved 
       on stores (is_approved);

    alter table user_blocks 
       add constraint uk_user_block_blocker_blocked unique (blocker_id, blocked_id);

    create index idx_user_bottle_user_id 
       on user_bottle (user_id);

    create index idx_user_bottle_user_category 
       on user_bottle (user_id, category);

    create index idx_user_bottle_user_public 
       on user_bottle (user_id, is_public);

    create index idx_user_email 
       on users (email);

    create index idx_user_oauth 
       on users (oauth_provider, oauth_id);

    alter table users 
       add constraint UK6dotkott2kjsp8vw4d0m25fb7 unique (email);

    create index idx_wishlist_user_id 
       on wishlist (user_id);

    create index idx_wishlist_spirit_id 
       on wishlist (spirit_id);

    alter table wishlist 
       add constraint uk_wishlist_user_spirit_type unique (user_id, spirit_id, type);

    alter table admin_logs 
       add constraint FKg2l1052y2vep295mm4su4yrnq 
       foreign key (actor_id) 
       references users (id);

    alter table attendance_logs 
       add constraint FKagvi0aj6qk90ch4ecipkckmw6 
       foreign key (user_id) 
       references users (id);

    alter table banner_images 
       add constraint FK633x0a6l0tvcjj7xoeaivj92t 
       foreign key (banner_id) 
       references banners (id);

    alter table banner_images 
       add constraint FKjynrcn3hdmrbet4q9lt31q4dv 
       foreign key (uploaded_by_id) 
       references users (id);

    alter table banners 
       add constraint FK28kfmy86jolmciytu5w6kuj3h 
       foreign key (created_by_id) 
       references users (id);

    alter table byob_comments 
       add constraint FK40a750hdauvltnn3haa5d9a1j 
       foreign key (author_id) 
       references users (id);

    alter table byob_comments 
       add constraint FK692f2ur9fg35jfn0goevje5m9 
       foreign key (byob_id) 
       references byobs (id);

    alter table byob_comments 
       add constraint FKd96c2euv43goephfdo0pfq9dg 
       foreign key (participant_user_id) 
       references users (id);

    alter table byob_host_bottles 
       add constraint FKo3tooogvdwv3scbk1isr1tixl 
       foreign key (byob_id) 
       references byobs (id);

    alter table byob_participants 
       add constraint FK8jh0gn4dag22fkg32b5nw2q5b 
       foreign key (byob_id) 
       references byobs (id);

    alter table byob_participants 
       add constraint FK1nil6dkfb7h5mmx9gvgqjpvwr 
       foreign key (spirit_id) 
       references spirit (id);

    alter table byob_participants 
       add constraint FK2ttw8fy06u5bvv75huy7yttpx 
       foreign key (user_id) 
       references users (id);

    alter table byobs 
       add constraint FKm6hw3geulxfv9c0j9ij6qvhsc 
       foreign key (host_id) 
       references users (id);

    alter table calendar_events 
       add constraint FK2eu3tcu4pk4s7hjndm2g06gnk 
       foreign key (created_by_id) 
       references users (id);

    alter table comment_emoji_reactions 
       add constraint FKk2tl8xyqhqpmeotwfiotjqbvm 
       foreign key (emoji_id) 
       references community_emojis (id);

    alter table comment_emoji_reactions 
       add constraint FKow609opkskbuxpsbbwogri7qs 
       foreign key (user_id) 
       references users (id);

    alter table comment_like 
       add constraint FKmo6l4wl9r7uoqs242im23h5mc 
       foreign key (comment_id) 
       references community_comment (id);

    alter table comment_like 
       add constraint FKl5wrmp8eoy5uegdo3473jqqi 
       foreign key (user_id) 
       references users (id);

    alter table community_comment 
       add constraint FKc9mct3uqphyiqyyowu3f406q5 
       foreign key (parent_id) 
       references community_comment (id);

    alter table community_comment 
       add constraint FKprnfm93ll2rdxgjx4aksrt6y5 
       foreign key (spirit_id) 
       references spirit (id);

    alter table community_comment 
       add constraint FKs9gc75wej6pldfjq4rfhioqli 
       foreign key (user_id) 
       references users (id);

    alter table community_emojis 
       add constraint FK64cci7sefal9jmvcwvw16frw0 
       foreign key (group_id) 
       references emoji_groups (id);

    alter table content_draft 
       add constraint FKimv514gnvcsnd88rw75v3o6jl 
       foreign key (user_id) 
       references users (id);

    alter table email_send_recipients 
       add constraint FKnr5ijo12x5n7qprysgpawk622 
       foreign key (log_id) 
       references email_send_logs (id);

    alter table legal_documents 
       add constraint FK2teauutx3tmeph4dtl5ql2g3a 
       foreign key (author_id) 
       references users (id);

    alter table message_items 
       add constraint FKnbrjt863o9ifjbxugtimjmumq 
       foreign key (message_id) 
       references messages (id);

    alter table message_items 
       add constraint FKpmxrklv9m9powj2vd9qd22tcx 
       foreign key (sender_id) 
       references users (id);

    alter table messages 
       add constraint FKt05r0b6n0iis8u7dfna4xdh73 
       foreign key (receiver_id) 
       references users (id);

    alter table messages 
       add constraint FK4ui4nnwntodh6wjvck53dbk9m 
       foreign key (sender_id) 
       references users (id);

    alter table notice 
       add constraint FKgib4imoxg1fihk96xdsgmu51o 
       foreign key (author_id) 
       references users (id);

    alter table notice_image 
       add constraint FK13h2d99jqpw7xnaj5w1crvv8m 
       foreign key (notice_id) 
       references notice (id);

    alter table notice_image 
       add constraint FK2wcxcg4i8l2ai1o95khhhpdor 
       foreign key (uploaded_by_id) 
       references users (id);

    alter table notice_recommend 
       add constraint FK59y2evpo3g9thijih7cl419jx 
       foreign key (notice_id) 
       references notice (id);

    alter table notice_recommend 
       add constraint FKf3j87d2qn94xprhv1p39s5c9b 
       foreign key (user_id) 
       references users (id);

    alter table notifications 
       add constraint FKqqnsjxlwleyjbxlmm213jaj3f 
       foreign key (recipient_id) 
       references users (id);

    alter table poll_options 
       add constraint FK1baxdjoxricfu0grc0j6821f7 
       foreign key (poll_id) 
       references polls (id);

    alter table poll_votes 
       add constraint FK974fgfa4183h12b8vns9226qs 
       foreign key (option_id) 
       references poll_options (id);

    alter table poll_votes 
       add constraint FKmaogo469u92y072mev488em6p 
       foreign key (poll_id) 
       references polls (id);

    alter table poll_votes 
       add constraint FK3q0e7cabgif9f1t7voom07bg5 
       foreign key (user_id) 
       references users (id);

    alter table polls 
       add constraint FK7lb5nmwvqxek882fm7b1oiusf 
       foreign key (id) 
       references posts (id);

    alter table popup_images 
       add constraint FKjn8pobsalv47bysuru6w8ppgv 
       foreign key (popup_id) 
       references popups (id);

    alter table popup_images 
       add constraint FK3ynwhfs7836eo1bodthg594fi 
       foreign key (uploaded_by_id) 
       references users (id);

    alter table popups 
       add constraint FKjs4kjll1b3wlxbdaspl5rh0qy 
       foreign key (created_by_id) 
       references users (id);

    alter table post_comments 
       add constraint FK9uedrlupih4x9c9qk1ntwdpie 
       foreign key (author_id) 
       references users (id);

    alter table post_comments 
       add constraint FKc3b7s6wypcsvua2ycn4o1lv2c 
       foreign key (parent_id) 
       references post_comments (id);

    alter table post_comments 
       add constraint FKaawaqxjs3br8dw5v90w7uu514 
       foreign key (post_id) 
       references posts (id);

    alter table post_images 
       add constraint FKo1i5va2d8de9mwq727vxh0s05 
       foreign key (post_id) 
       references posts (id);

    alter table post_images 
       add constraint FK7cwb5w3hey95n07ohs3dugxal 
       foreign key (uploaded_by_id) 
       references users (id);

    alter table post_likes 
       add constraint FKa5wxsgl4doibhbed9gm7ikie2 
       foreign key (post_id) 
       references posts (id);

    alter table post_likes 
       add constraint FKkgau5n0nlewg6o9lr4yibqgxj 
       foreign key (user_id) 
       references users (id);

    alter table post_reports 
       add constraint FKm5v2ewbmla1wmgaeldmm3yf9g 
       foreign key (comment_id) 
       references post_comments (id);

    alter table post_reports 
       add constraint FK7ccpkj5jys037f9pq98l31ya2 
       foreign key (post_id) 
       references posts (id);

    alter table post_reports 
       add constraint FKqi5fmh45u32i63971en0rmrvo 
       foreign key (reporter_id) 
       references users (id);

    alter table post_scraps 
       add constraint FKp8dj37oryhvcnh85n6dfde7qp 
       foreign key (post_id) 
       references posts (id);

    alter table post_scraps 
       add constraint FKbbttblkn4q7155ey1nl0dn57j 
       foreign key (user_id) 
       references users (id);

    alter table posts 
       add constraint FK6xvn0811tkyo3nfjk2xvqx6ns 
       foreign key (author_id) 
       references users (id);

    alter table posts 
       add constraint FKljl6fuuilf616niagktykbpe7 
       foreign key (distillery_tag_id) 
       references producer (id);

    alter table posts 
       add constraint FKd74ydhsrvvhe00xte1jt02xkf 
       foreign key (prefix_id) 
       references post_prefixes (id);

    alter table posts 
       add constraint FKrpl8opijphnmefnx6adplhe90 
       foreign key (series_id) 
       references series (id);

    alter table price_alerts 
       add constraint FKg679b1j3vp8j2m68naqxgfy6p 
       foreign key (spirit_id) 
       references spirit (id);

    alter table price_alerts 
       add constraint FKaqq01qkath6ujf2ikwey10q8l 
       foreign key (user_id) 
       references users (id);

    alter table price_discount_items 
       add constraint FKmmprdj7kb3ftsgxp2hjnxt2ka 
       foreign key (price_report_id) 
       references price_reports (id);

    alter table price_report_images 
       add constraint FKjq43724wotxwiy6sqgcm60rmt 
       foreign key (price_report_id) 
       references price_reports (id);

    alter table price_report_images 
       add constraint FK4h1b6yn1oxuufuoqexebanfqy 
       foreign key (uploaded_by_id) 
       references users (id);

    alter table price_report_reports 
       add constraint FK18jbtbx1aaff5e6fb83jdlh6i 
       foreign key (price_report_id) 
       references price_reports (id);

    alter table price_report_reports 
       add constraint FKj3std86pgpw3wufoqi50k7ld2 
       foreign key (reporter_id) 
       references users (id);

    alter table price_report_reports 
       add constraint FKasah0ymu3nr86ss5t9xyxhljq 
       foreign key (resolved_by_id) 
       references users (id);

    alter table price_reports 
       add constraint FKtnpwgnimivc4lw5ld6vhrfqen 
       foreign key (approved_by_id) 
       references users (id);

    alter table price_reports 
       add constraint FKnli87d72bw0amuja6r888ro6a 
       foreign key (reporter_id) 
       references users (id);

    alter table price_reports 
       add constraint FKox8upavdcvbf6rpyswnx3buqj 
       foreign key (spirit_id) 
       references spirit (id);

    alter table price_reports 
       add constraint FKjpq5ba4ui1356v1n4o4xah4wj 
       foreign key (store_id) 
       references stores (id);

    alter table producer_register_request 
       add constraint FKbwvu6onqmusqdv8xmbqf0weby 
       foreign key (reviewed_by_id) 
       references users (id);

    alter table producer_register_request 
       add constraint FKlmjqit563slgq484scwanufg4 
       foreign key (user_id) 
       references users (id);

    alter table report 
       add constraint FKqbhdxqd3ly7fkhly5nrl2j93k 
       foreign key (reporter_id) 
       references users (id);

    alter table review 
       add constraint FKqdex5xsdnmbd4iitj82uol9x0 
       foreign key (spirit_id) 
       references spirit (id);

    alter table review 
       add constraint FK6cpw2nlklblpvc7hyt7ko6v3e 
       foreign key (user_id) 
       references users (id);

    alter table role_type_allowed_menus 
       add constraint FK4aquc3srfudqeipwk5paj5pm5 
       foreign key (role_type_id) 
       references role_types (id);

    alter table score_history 
       add constraint FKhd7knvy68f2ns4d0umdsuv43l 
       foreign key (user_id) 
       references users (id);

    alter table series 
       add constraint FKl1a8bepia7402bf9jqg1bge1j 
       foreign key (author_id) 
       references users (id);

    alter table spirit 
       add constraint FKa1jbstotx23d1i602e4mc926r 
       foreign key (producer_id) 
       references producer (id);

    alter table spirit 
       add constraint FKk2iuytacfdlwe7fu9047pnhii 
       foreign key (registered_by_id) 
       references users (id);

    alter table spirit_cognac_detail 
       add constraint FKrnsctmhsnh9w93n8noncibqsf 
       foreign key (spirit_id) 
       references spirit (id);

    alter table spirit_common_detail 
       add constraint FKcsfcguef90nua28oju8m33glx 
       foreign key (spirit_id) 
       references spirit (id);

    alter table spirit_image 
       add constraint FK9wgcumw69uo6anvje0rw4vd89 
       foreign key (spirit_id) 
       references spirit (id);

    alter table spirit_other_detail 
       add constraint FKlnq9e3sh4es10y9nhfdakt6xw 
       foreign key (spirit_id) 
       references spirit (id);

    alter table spirit_register_request 
       add constraint FKthh9q63k7qs07sf8oiqxgik9 
       foreign key (reviewed_by_id) 
       references users (id);

    alter table spirit_register_request 
       add constraint FK7vtcwmey108rh4gir70ny5wgm 
       foreign key (user_id) 
       references users (id);

    alter table spirit_whisky_detail 
       add constraint FK2emism78jobp8qg3ixwiodavn 
       foreign key (spirit_id) 
       references spirit (id);

    alter table spirit_wine_detail 
       add constraint FKsjj32g1oyww5js3o4nm6u3720 
       foreign key (spirit_id) 
       references spirit (id);

    alter table store_aliases 
       add constraint FKh06hn8akgydgjiil5a1hr8wiy 
       foreign key (store_id) 
       references stores (id);

    alter table stores 
       add constraint FK926rba6w5atw7qhggb5fxupun 
       foreign key (approved_by_id) 
       references users (id);

    alter table stores 
       add constraint FKlp38jjdmwh1gfsjat43v5vqa2 
       foreign key (created_by_id) 
       references users (id);

    alter table user_blocks 
       add constraint FK7k3mfgb03bnmwh81vqb1u5h80 
       foreign key (blocked_id) 
       references users (id);

    alter table user_blocks 
       add constraint FKgvu85oyjrfafwttb7iphgmm0v 
       foreign key (blocker_id) 
       references users (id);

    alter table user_board_permissions 
       add constraint FKsxdxauvdu3p8ws329a2ijd07u 
       foreign key (user_id) 
       references users (id);

    alter table user_bottle 
       add constraint FK4wia3pvcs9v9rq522b88sqlw7 
       foreign key (spirit_id) 
       references spirit (id);

    alter table user_bottle 
       add constraint FKfka2pqj1eo2us61nepheefli2 
       foreign key (user_id) 
       references users (id);

    alter table user_bottle_image 
       add constraint FKfcamqbpye3lnokswjuq426ly2 
       foreign key (user_bottle_id) 
       references user_bottle (id);

    alter table users 
       add constraint FKst1plmwt6pwpravmhtba7b9gg 
       foreign key (producer_id) 
       references producer (id);

    alter table users 
       add constraint FKb7edkxkb2uwj3erltmbdux9r7 
       foreign key (role_type_id) 
       references role_types (id);

    alter table wishlist 
       add constraint FKflg9pjdq904wwuf1n9suud5c6 
       foreign key (spirit_id) 
       references spirit (id);

    alter table wishlist 
       add constraint FKtrd6335blsefl2gxpb8lr0gr7 
       foreign key (user_id) 
       references users (id);
