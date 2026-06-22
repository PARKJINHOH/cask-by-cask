-- 모든 주류의 평점 및 리뷰 수 초기화
UPDATE spirit SET review_count = 0, avg_score = NULL;

-- 1. 하위 에디션(자식 주류) 평점 및 리뷰 수 계산
UPDATE spirit s
JOIN (
    SELECT 
        r.spirit_id,
        COUNT(*) as total_count,
        ROUND(AVG(r.total_score), 1) as avg_score
    FROM review r
    WHERE r.is_hidden = 0 
      AND r.deleted_at IS NULL
    GROUP BY r.spirit_id
) stats ON s.id = stats.spirit_id
SET s.review_count = stats.total_count,
    s.avg_score = stats.avg_score
WHERE s.parent_id IS NOT NULL;

-- 2. 마스터 주류(부모 주류) 평점 및 리뷰 수 계산 (자신 + 자식 주류의 리뷰 모두 포함)
UPDATE spirit s
JOIN (
    SELECT 
        parent_spirit_id,
        COUNT(*) as total_count,
        ROUND(AVG(total_score), 1) as avg_score
    FROM (
        SELECT 
            r.total_score,
            COALESCE(child.parent_id, child.id) as parent_spirit_id
        FROM review r
        JOIN spirit child ON r.spirit_id = child.id
        WHERE r.is_hidden = 0 
          AND r.deleted_at IS NULL
    ) t
    GROUP BY parent_spirit_id
) stats ON s.id = stats.parent_spirit_id
SET s.review_count = stats.total_count,
    s.avg_score = stats.avg_score
WHERE s.parent_id IS NULL;
