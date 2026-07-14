-- 가격은 주류 마스터의 대표 용량이 아니라 거래 당시 병 1개의 용량을 보존한다.
-- 기존 운영 데이터는 출처에서 용량을 확정할 수 없으므로 NULL(용량 미확인)로 유지한다.
ALTER TABLE price_reports
    ADD COLUMN volume_ml INT NULL COMMENT '거래 당시 병 1개 용량(ml)';

ALTER TABLE deal_posts
    ADD COLUMN volume_ml INT NULL COMMENT '핫딜 대상 병 1개 용량(ml)';

ALTER TABLE price_alerts
    ADD COLUMN volume_ml INT NULL COMMENT '알림 대상 병 1개 용량(ml), NULL은 기존 전체 용량 알림';

ALTER TABLE price_alerts
    DROP INDEX uq_price_alert_user_spirit,
    ADD CONSTRAINT uq_price_alert_user_spirit_volume UNIQUE (user_id, spirit_id, volume_ml);

CREATE INDEX idx_price_report_spirit_status_volume_purchased
    ON price_reports (spirit_id, status, volume_ml, purchased_at);

CREATE INDEX idx_deal_post_spirit_status_visible_volume
    ON deal_posts (spirit_id, status, is_visible, volume_ml);
