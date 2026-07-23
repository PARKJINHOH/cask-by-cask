-- 와인 빈티지 연도를 spirit.vintage_year 한 곳으로 통합하고
-- 논빈티지(NV)와 정보 미상을 구분할 상태 컬럼을 추가한다.

ALTER TABLE spirit_wine_detail
    ADD COLUMN vintage_status varchar(20) NULL COMMENT '빈티지 상태 — VINTAGE/NON_VINTAGE/UNKNOWN' AFTER wine_type;

-- 기존 관리자 폼의 와인 상세 빈티지를 우선하고, 값이 없을 때만 공통 빈티지를 사용한다.
UPDATE spirit s
JOIN spirit_wine_detail swd ON swd.spirit_id = s.id
SET s.vintage_year = COALESCE(swd.vintage, s.vintage_year),
    swd.vintage_status = CASE
        WHEN COALESCE(swd.vintage, s.vintage_year) IS NOT NULL THEN 'VINTAGE'
        ELSE 'UNKNOWN'
    END
WHERE s.category = 'WINE';

-- 상세 행이 없던 기존 와인도 상태를 명시할 수 있도록 최소 상세 행을 만든다.
INSERT INTO spirit_wine_detail (spirit_id, vintage_status)
SELECT s.id,
       CASE WHEN s.vintage_year IS NOT NULL THEN 'VINTAGE' ELSE 'UNKNOWN' END
FROM spirit s
LEFT JOIN spirit_wine_detail swd ON swd.spirit_id = s.id
WHERE s.category = 'WINE'
  AND swd.spirit_id IS NULL;

-- 방어적으로 모든 와인 상세 행에 상태를 채운 뒤 NOT NULL 제약을 적용한다.
UPDATE spirit_wine_detail
SET vintage_status = 'UNKNOWN'
WHERE vintage_status IS NULL;

ALTER TABLE spirit_wine_detail
    MODIFY COLUMN vintage_status varchar(20) NOT NULL COMMENT '빈티지 상태 — VINTAGE/NON_VINTAGE/UNKNOWN';

ALTER TABLE spirit_wine_detail
    MODIFY COLUMN is_natural_wine bit NULL COMMENT '내추럴 와인 표방 여부';

DROP INDEX idx_wine_vintage ON spirit_wine_detail;

ALTER TABLE spirit_wine_detail
    DROP COLUMN vintage;

CREATE INDEX idx_spirit_vintage_year ON spirit (vintage_year);

-- 출시일은 와인 식별 정보로 사용하지 않는다. 다른 카테고리의 출시일은 유지한다.
UPDATE spirit_common_detail scd
JOIN spirit s ON s.id = scd.spirit_id
SET scd.release_date = NULL
WHERE s.category = 'WINE';
