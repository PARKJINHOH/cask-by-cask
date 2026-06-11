-- 개선·문의(feedback) 공개 여부.
-- 기본값 공개(전체 회원이 목록/상세 열람 가능). 비공개는 기존과 동일하게 작성자+관리자만 열람.
ALTER TABLE feedback ADD COLUMN is_public bit NOT NULL DEFAULT 1;

-- 개선·문의 작성/해결 점수
INSERT IGNORE INTO score_config
    (action_type, score, daily_limit, is_active, description, created_at, updated_at)
VALUES
    ('FEEDBACK_WRITE',    5,  NULL, 1, '개선·문의 작성',         NOW(6), NOW(6)),
    ('FEEDBACK_RESOLVED', 15, NULL, 1, '개선·문의 해결 완료 보너스', NOW(6), NOW(6));
