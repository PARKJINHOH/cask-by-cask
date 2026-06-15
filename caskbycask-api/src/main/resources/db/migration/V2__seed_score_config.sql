-- =============================================================================
-- CaskByCask 기초데이터 — 숙성력 점수 설정(score_config)
-- =============================================================================
-- 통합: 구 V7(기본 액션) + 구 V24(개선·문의) + 구 V28(가격정보 등록) + 구 V30(이벤트 제보).
--       모든 시스템 액션 키를 한 파일에 모음. (구 ScoreDataInitializer 를 Flyway 로 이관)
--       이관 후 관리자 점수 설정 화면에서 추가/수정/삭제로 운영 관리한다.
--
-- [주의]
--   - action_type 은 자유 문자열 키이며 ScoreActions 상수와 대응한다. UNIQUE 제약.
--   - daily_limit 이 NULL 이면 일일 무제한, 값이 있으면 하루 최대 적립 점수.
--   - INSERT IGNORE: action_type UNIQUE 충돌 시 조용히 건너뜀.
-- =============================================================================

INSERT IGNORE INTO score_config
    (action_type, score, daily_limit, is_active, description, created_at, updated_at)
VALUES
    ('POST_WRITE_GENERAL',         5,   NULL, 1, '자유게시판 일반 글쓰기',            NOW(6), NOW(6)),
    ('POST_WRITE_QUESTION',        5,   NULL, 1, '자유게시판 질문 글쓰기',            NOW(6), NOW(6)),
    ('POST_WRITE_REVIEW',          8,   NULL, 1, '자유게시판 리뷰 글쓰기',            NOW(6), NOW(6)),
    ('POST_WRITE_SHARING',         5,   NULL, 1, '자유게시판 나눔 글쓰기',            NOW(6), NOW(6)),
    ('POST_WRITE_DISTILLERY_TOUR', 8,   NULL, 1, '자유게시판 증류소투어 글쓰기',       NOW(6), NOW(6)),
    ('POST_WRITE_NOTICE',          10,  NULL, 1, '소식 게시판 글쓰기',                NOW(6), NOW(6)),
    ('POST_DELETE',                -5,  NULL, 1, '게시글 삭제 차감',                  NOW(6), NOW(6)),
    ('POST_LOCKED',                -10, NULL, 1, '신고 잠금 차감',                    NOW(6), NOW(6)),
    ('POST_LIKED',                 2,   NULL, 1, '추천 받음',                        NOW(6), NOW(6)),
    ('COMMENT_WRITE',              1,   NULL, 1, '댓글 작성',                        NOW(6), NOW(6)),
    ('SPIRIT_REVIEW_WRITE',        20,  NULL, 1, '술 상세 리뷰 작성',                 NOW(6), NOW(6)),
    ('SPIRIT_REQUEST',             10,  NULL, 1, '술 등록 요청',                     NOW(6), NOW(6)),
    ('SPIRIT_REQUEST_APPROVED',    30,  NULL, 1, '술 등록 요청 승인',                 NOW(6), NOW(6)),
    ('WISHLIST_ADD',               1,   NULL, 1, '위시리스트 추가',                   NOW(6), NOW(6)),
    ('ATTENDANCE',                 3,   NULL, 1, '출석 체크',                        NOW(6), NOW(6)),
    ('ATTENDANCE_STREAK_7',        10,  NULL, 1, '7일 연속 출석 보너스',              NOW(6), NOW(6)),
    ('ATTENDANCE_STREAK_30',       30,  NULL, 1, '30일 연속 출석 보너스',             NOW(6), NOW(6)),
    ('ADMIN_ADJUST',               0,   NULL, 1, '관리자 수동 조정 (실제값은 amount 파라미터 사용)', NOW(6), NOW(6)),
    ('PRICE_REGISTER',             3,   NULL, 1, '가격정보 등록 승인',                NOW(6), NOW(6)),
    ('FEEDBACK_WRITE',             5,   NULL, 1, '개선·문의 작성',                   NOW(6), NOW(6)),
    ('FEEDBACK_RESOLVED',          15,  NULL, 1, '개선·문의 해결 완료 보너스',         NOW(6), NOW(6)),
    ('EVENT_SUGGEST_APPROVED',     3,   NULL, 1, '이벤트 제보 승인',                  NOW(6), NOW(6));

SELECT 1;
