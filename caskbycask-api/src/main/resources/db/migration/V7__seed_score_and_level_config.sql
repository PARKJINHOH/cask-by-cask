-- =============================================================================
-- CaskByCask 기초데이터 — 숙성력 점수 설정(score_config)
-- =============================================================================
-- 작성 기준일: 2026-06-01
-- 범위: 기존 ScoreDataInitializer.java(소스 하드코딩 시드)를 Flyway 마이그레이션으로 이관.
--       이관 후 관리자 페이지에서 추가/수정/삭제로 운영 관리한다.
--       (회원 레벨 설정(member_level_config)은 V28 에서 시드한다.)
--
-- [주의]
--   - Flyway 버전 마이그레이션입니다. 한 번 적용된 후에는 이 파일을 수정하지 마세요.
--     (체크섬 검증 실패로 기동이 막힙니다. 보정이 필요하면 V29__*.sql 로 추가하세요.)
--   - 기존 운영/개발 DB 에는 ScoreDataInitializer 가 이미 동일 데이터를 적재해 두었을 수 있어
--     INSERT IGNORE 를 사용합니다. (action_type / level UNIQUE 제약 충돌 시 조용히 건너뜀)
--   - score_config.action_type 은 자유 문자열 키입니다. 아래 시스템 액션 키는 ScoreActions 상수와 대응하며,
--     관리자는 점수 설정 화면에서 임의 키를 추가/수정/삭제할 수 있습니다.
--   - daily_limit 이 NULL 이면 일일 무제한, 값이 있으면 하루 최대 적립 점수입니다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 점수 설정 (score_config)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO score_config
    (action_type, score, daily_limit, is_active, description, created_at, updated_at)
VALUES
    ('POST_WRITE_GENERAL',         5,  NULL, 1, '자유게시판 일반 글쓰기',            NOW(6), NOW(6)),
    ('POST_WRITE_QUESTION',        5,  NULL, 1, '자유게시판 질문 글쓰기',            NOW(6), NOW(6)),
    ('POST_WRITE_REVIEW',          8,  NULL, 1, '자유게시판 리뷰 글쓰기',            NOW(6), NOW(6)),
    ('POST_WRITE_SHARING',         5,  NULL, 1, '자유게시판 나눔 글쓰기',            NOW(6), NOW(6)),
    ('POST_WRITE_DISTILLERY_TOUR', 8,  NULL, 1, '자유게시판 증류소투어 글쓰기',       NOW(6), NOW(6)),
    ('POST_WRITE_NOTICE',          10, NULL, 1, '소식 게시판 글쓰기',                NOW(6), NOW(6)),
    ('POST_DELETE',                -5, NULL, 1, '게시글 삭제 차감',                  NOW(6), NOW(6)),
    ('POST_LOCKED',                -10,NULL, 1, '신고 잠금 차감',                    NOW(6), NOW(6)),
    ('POST_LIKED',                 2,  NULL, 1, '추천 받음',                        NOW(6), NOW(6)),
    ('COMMENT_WRITE',              1,  NULL, 1, '댓글 작성',                        NOW(6), NOW(6)),
    ('SPIRIT_REVIEW_WRITE',        20, NULL, 1, '술 상세 리뷰 작성',                 NOW(6), NOW(6)),
    ('SPIRIT_REQUEST',             10, NULL, 1, '술 등록 요청',                     NOW(6), NOW(6)),
    ('SPIRIT_REQUEST_APPROVED',    30, NULL, 1, '술 등록 요청 승인',                 NOW(6), NOW(6)),
    ('WISHLIST_ADD',               1,  NULL, 1, '위시리스트 추가',                   NOW(6), NOW(6)),
    ('ATTENDANCE',                 3,  NULL, 1, '출석 체크',                        NOW(6), NOW(6)),
    ('ATTENDANCE_STREAK_7',        10, NULL, 1, '7일 연속 출석 보너스',              NOW(6), NOW(6)),
    ('ATTENDANCE_STREAK_30',       30, NULL, 1, '30일 연속 출석 보너스',             NOW(6), NOW(6)),
    ('ADMIN_ADJUST',               0,  NULL, 1, '관리자 수동 조정 (실제값은 amount 파라미터 사용)', NOW(6), NOW(6));

SELECT 1;
