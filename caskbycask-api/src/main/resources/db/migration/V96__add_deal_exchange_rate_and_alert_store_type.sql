-- 가격 동향 차트는 price_reports 와 deal_posts 를 합쳐 원화 축 하나로 집계한다.
-- price_reports 는 V54 에서 환율 스냅샷을 갖췄지만 deal_posts 는 원 통화 금액만 갖고 있어,
-- PriceChartService 가 "$187 → 187원" 으로 집계해 왔다(운영 spirit 236 면세 탭에서 실제 발생).
-- deal_posts 에도 동일한 환산 컬럼을 두어 두 소스의 의미를 일치시킨다.
ALTER TABLE deal_posts
    ADD COLUMN deal_price_krw DECIMAL(14,0) NULL
        COMMENT '수집 당시 환율 기준 원화 할인가'
        AFTER deal_price,
    ADD COLUMN original_price_krw DECIMAL(14,0) NULL
        COMMENT '수집 당시 환율 기준 원화 정가'
        AFTER deal_price_krw,
    ADD COLUMN exchange_rate_snapshot DECIMAL(18,8) NULL
        COMMENT '외화 1단위당 원화 환율 스냅샷',
    ADD COLUMN exchange_rate_date DATE NULL
        COMMENT '적용 환율 기준일';

-- KRW 행은 환율 조회 없이 자기 자신으로 확정한다.
UPDATE deal_posts
SET deal_price_krw = deal_price,
    original_price_krw = original_price
WHERE currency IS NULL OR currency = 'KRW';

-- 외화 행은 과거 환율이 필요하므로 여기서 채우지 않는다.
-- POST /api/admin/deals/backfill-krw 가 crawled_at 기준 과거 환율로 일괄 백필한다.
-- 백필 전까지 deal_price_krw 가 NULL 인 행은 PriceChartService 가 차트에서 제외한다.

-- ─────────────────────────────────────────────────────────────
-- 목표가 알림: 국내 전용 → 국내/해외/면세 구간별 알림으로 확대
-- ─────────────────────────────────────────────────────────────
ALTER TABLE price_alerts
    ADD COLUMN store_type VARCHAR(20) NOT NULL DEFAULT 'DOMESTIC'
        COMMENT '알림 대상 구간 — DOMESTIC/OVERSEAS/DUTYFREE'
        AFTER volume_ml,
    ADD COLUMN last_notified_price_krw DECIMAL(14,0) NULL
        COMMENT '마지막 알림 발동 시점의 원화 가격(동일가 반복 알림 억제용)';

-- 기존 알림은 AdminPriceReportService 게이트로 국내 KRW 제보에만 반응해 왔다.
-- DEFAULT 'DOMESTIC' 이 이미 채워 넣으므로 기존 사용자 동작이 그대로 보존된다.

-- 레거시 volume_ml IS NULL 알림은 해당 술의 어떤 용량 가격에도 발동한다(700ml 목표가가 50ml 에 발동).
-- 승인된 가격이 가장 많은 용량으로 확정한다. 대상 테이블을 그대로 서브쿼리에 쓰면 MySQL 이 막으므로
-- 결정된 값을 임시 테이블에 먼저 모아 두고 JOIN 으로 반영한다.
CREATE TEMPORARY TABLE tmp_price_alert_volume (
    alert_id BIGINT NOT NULL PRIMARY KEY,
    resolved_volume_ml INT NOT NULL
);

INSERT INTO tmp_price_alert_volume (alert_id, resolved_volume_ml)
SELECT resolved.alert_id, resolved.resolved_volume_ml
  FROM (SELECT a.id AS alert_id,
               (SELECT r.volume_ml
                  FROM price_reports r
                 WHERE r.spirit_id = a.spirit_id
                   AND r.status = 'APPROVED'
                   AND r.volume_ml IS NOT NULL
                 GROUP BY r.volume_ml
                 ORDER BY COUNT(*) DESC, r.volume_ml DESC
                 LIMIT 1) AS resolved_volume_ml
          FROM price_alerts a
         WHERE a.volume_ml IS NULL) resolved
 WHERE resolved.resolved_volume_ml IS NOT NULL;

-- 같은 사용자가 이미 그 용량·구간 알림을 갖고 있으면 유니크 키와 충돌하므로 대상에서 뺀다.
DELETE t FROM tmp_price_alert_volume t
  JOIN price_alerts a ON a.id = t.alert_id
  JOIN price_alerts b ON b.user_id = a.user_id
                     AND b.spirit_id = a.spirit_id
                     AND b.volume_ml = t.resolved_volume_ml
                     AND b.store_type = a.store_type
                     AND b.id <> a.id;

UPDATE price_alerts a
  JOIN tmp_price_alert_volume t ON t.alert_id = a.id
   SET a.volume_ml = t.resolved_volume_ml;

DROP TEMPORARY TABLE tmp_price_alert_volume;

-- 용량을 확정하지 못한 알림은 오발동을 막기 위해 비활성화한다(사용자가 다시 설정할 수 있다).
UPDATE price_alerts
SET is_active = 0
WHERE volume_ml IS NULL;

-- 구간별로 독립된 목표가를 설정할 수 있도록 유니크 키를 확장한다.
-- (위 백필이 끝난 뒤 교체해야 중간 상태에서 제약이 걸리지 않는다.)
ALTER TABLE price_alerts
    DROP INDEX uq_price_alert_user_spirit_volume,
    ADD CONSTRAINT uq_price_alert_user_spirit_volume_store
        UNIQUE (user_id, spirit_id, volume_ml, store_type);

CREATE INDEX idx_price_alert_spirit_volume_store_active
    ON price_alerts (spirit_id, volume_ml, store_type, is_active);
