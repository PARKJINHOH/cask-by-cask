-- AI 소식 기본 말머리를 보장하고, 검토 중인 정보 글 주제가 다시 선택되지 않도록 운영 데이터를 보정한다.

INSERT INTO post_prefixes (
    is_active, sort_order, color_hex, created_at, updated_at, name, board_type
)
SELECT b'1', 0, '#6B7280', NOW(6), NOW(6), '일반', 'NOTICE'
WHERE NOT EXISTS (
    SELECT 1
    FROM post_prefixes
    WHERE board_type = 'NOTICE'
      AND name = '일반'
);

UPDATE ai_news_articles article
JOIN (
    SELECT id
    FROM post_prefixes
    WHERE board_type = 'NOTICE'
      AND name = '일반'
    ORDER BY sort_order ASC, id ASC
    LIMIT 1
) default_prefix
SET article.prefix_id = default_prefix.id
WHERE article.prefix_id IS NULL;

UPDATE posts post
JOIN ai_news_articles article
  ON article.post_id = post.id
JOIN (
    SELECT id
    FROM post_prefixes
    WHERE board_type = 'NOTICE'
      AND name = '일반'
    ORDER BY sort_order ASC, id ASC
    LIMIT 1
) default_prefix
SET post.prefix_id = default_prefix.id
WHERE post.prefix_id IS NULL;

UPDATE ai_news_topics topic
JOIN (
    SELECT DISTINCT topic_id
    FROM ai_news_articles
    WHERE topic_id IS NOT NULL
      AND status IN ('DRAFT', 'PENDING_REVIEW', 'SCHEDULED', 'REWRITE_REQUESTED', 'FAILED')
) active_article
  ON active_article.topic_id = topic.id
SET topic.status = 'HOLD',
    topic.updated_at = NOW(6)
WHERE topic.status = 'READY';
