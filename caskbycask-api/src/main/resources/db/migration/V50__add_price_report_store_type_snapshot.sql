-- 매장 마스터와 무관하게 가격 제보 당시 판매처 유형을 보존한다.
-- nullable VARCHAR로 추가해 구버전 애플리케이션 롤백과 기존 데이터 호환성을 유지한다.
ALTER TABLE price_reports
    ADD COLUMN store_type_snapshot VARCHAR(20) NULL
    COMMENT '가격 제보 당시 판매처 유형 — DOMESTIC/OVERSEAS/DUTYFREE'
    AFTER store_id;

-- 기존 연결 매장의 유형을 우선 사용한다. 직접 입력된 레거시 데이터는
-- USD/면세 채널로 면세 여부를 복원하고, 구분할 수 없는 건은 기존 동작대로 국내로 둔다.
UPDATE price_reports pr
LEFT JOIN stores s ON s.id = pr.store_id
SET pr.store_type_snapshot = CASE
    WHEN s.id IS NOT NULL THEN CAST(s.store_type AS CHAR)
    WHEN pr.currency = 'USD' OR pr.suggested_dutyfree_channel IS NOT NULL THEN 'DUTYFREE'
    ELSE 'DOMESTIC'
END
WHERE pr.store_type_snapshot IS NULL;
