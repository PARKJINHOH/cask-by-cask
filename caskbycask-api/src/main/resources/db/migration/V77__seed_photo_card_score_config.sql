-- =============================================================================
-- 이미지 갤러리 글쓰기 점수 정책
-- =============================================================================
-- PHOTO 게시판을 추가하면 resolvePostActionType() 이 POST_WRITE_GENERAL(5점)로
-- 떨어지므로 전용 액션 키를 둔다. 리뷰 글쓰기(POST_WRITE_REVIEW)와 같은 8점.
--
-- daily_limit 을 거는 이유: 사진은 글보다 작성 비용이 낮아 점수 파밍 여지가 크다.
-- daily_limit 은 횟수가 아니라 **하루 적립 점수 합계** 상한이다
-- (ScoreService 가 sumTodayScoreByUserAndAction 과 비교한다) → 8점 × 5회/일.
--
-- ※ 최고관리자·관리자 제외는 이미 보장된다 —
--    ScoreService.isScoreEligible() 이 Role.MEMBER 만 통과시킨다.
-- =============================================================================

INSERT IGNORE INTO score_config
    (action_type, score, daily_limit, is_active, description, created_at, updated_at)
VALUES
    ('POST_WRITE_PHOTO', 8, 40, 1, '이미지 갤러리 글쓰기', NOW(6), NOW(6));
