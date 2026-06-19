-- 와인 관능(맛) 지표를 검색/필터 대상 전용 컬럼으로 승격.
-- 기존에는 spirit_wine_detail.extra_data(JSON) 에 보관 → 인덱스 가능한 enum 컬럼으로 이전.
-- enum 값 순서는 Hibernate 가 생성하는 순서(알파벳)와 동일하게 맞춰 ddl-auto=validate 통과.

ALTER TABLE spirit_wine_detail
    ADD COLUMN sweetness enum('DRY','MEDIUM','OFF_DRY','SWEET') NULL COMMENT '당도 — DRY/OFF_DRY/MEDIUM/SWEET',
    ADD COLUMN body      enum('FULL','LIGHT','MEDIUM')          NULL COMMENT '바디 — LIGHT/MEDIUM/FULL',
    ADD COLUMN acidity   enum('HIGH','LOW','MEDIUM')            NULL COMMENT '산도 — LOW/MEDIUM/HIGH',
    ADD COLUMN tannin    enum('HIGH','LOW','MEDIUM')            NULL COMMENT '타닌 — LOW/MEDIUM/HIGH';

-- 기존 JSON(extra_data) 에 값이 있으면 컬럼으로 백필 (유효 enum 값만)
UPDATE spirit_wine_detail
SET sweetness = JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.sweetness'))
WHERE JSON_VALID(extra_data)
  AND JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.sweetness')) IN ('DRY','OFF_DRY','MEDIUM','SWEET');

UPDATE spirit_wine_detail
SET body = JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.body'))
WHERE JSON_VALID(extra_data)
  AND JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.body')) IN ('LIGHT','MEDIUM','FULL');

UPDATE spirit_wine_detail
SET acidity = JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.acidity'))
WHERE JSON_VALID(extra_data)
  AND JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.acidity')) IN ('LOW','MEDIUM','HIGH');

UPDATE spirit_wine_detail
SET tannin = JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.tannin'))
WHERE JSON_VALID(extra_data)
  AND JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.tannin')) IN ('LOW','MEDIUM','HIGH');

CREATE INDEX idx_wine_sweetness ON spirit_wine_detail (sweetness);
CREATE INDEX idx_wine_body      ON spirit_wine_detail (body);
CREATE INDEX idx_wine_acidity   ON spirit_wine_detail (acidity);
CREATE INDEX idx_wine_tannin    ON spirit_wine_detail (tannin);
