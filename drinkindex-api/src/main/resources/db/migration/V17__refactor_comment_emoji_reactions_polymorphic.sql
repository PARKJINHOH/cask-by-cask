-- =============================================================================
-- [패치 13] comment_emoji_reactions 다형성 구조 전환
-- =============================================================================
-- 기존: comment_id(post_comments) 단일 참조
-- 변경: target_type ENUM(POST_COMMENT|SPIRIT_COMMENT) + target_id
--       → 게시판 댓글 + 술 상세 댓글 이모지 반응을 한 테이블로 통합
-- UNIQUE(target_type, target_id, emoji_id, user_id)
--
-- local/dev 는 ddl-auto 가 처리하지만, prod(ddl-auto: none)는 본 마이그레이션으로 전환한다.
-- 오픈 전(데이터 거의 없음)이라 기존 comment_id 레코드는 POST_COMMENT 로 백필.
-- 컬럼/제약 존재 여부에 따라 안전하게 동작하도록 방어적으로 작성(MariaDB 10.x).
-- =============================================================================

-- 1) 신규 컬럼 추가 (우선 nullable)
ALTER TABLE comment_emoji_reactions
    ADD COLUMN IF NOT EXISTS target_type VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS target_id   BIGINT      NULL;

-- 2) 레거시 comment_id 가 남아 있으면 POST_COMMENT 로 백필 (컬럼 존재 시에만 실행)
SET @has_comment_id := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'comment_emoji_reactions'
      AND COLUMN_NAME = 'comment_id'
);
SET @sql := IF(@has_comment_id > 0,
    'UPDATE comment_emoji_reactions SET target_type = ''POST_COMMENT'', target_id = comment_id WHERE target_id IS NULL',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) 백필 완료 후 NOT NULL 로 전환
ALTER TABLE comment_emoji_reactions
    MODIFY COLUMN target_type VARCHAR(20) NOT NULL,
    MODIFY COLUMN target_id   BIGINT      NOT NULL;

-- 4) 레거시 unique 제약 / comment_id 컬럼 제거
ALTER TABLE comment_emoji_reactions
    DROP INDEX IF EXISTS uk_emoji_reaction_comment_emoji_user;
ALTER TABLE comment_emoji_reactions
    DROP COLUMN IF EXISTS comment_id;

-- 5) 신규 unique 제약 + 조회 인덱스
ALTER TABLE comment_emoji_reactions
    ADD UNIQUE KEY IF NOT EXISTS uk_emoji_reaction_target_emoji_user (target_type, target_id, emoji_id, user_id);
CREATE INDEX IF NOT EXISTS idx_emoji_reaction_target ON comment_emoji_reactions (target_type, target_id);
