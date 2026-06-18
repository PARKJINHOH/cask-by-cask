ALTER TABLE stores MODIFY COLUMN store_type ENUM('DOMESTIC', 'OVERSEAS', 'DUTYFREE') NOT NULL COMMENT '판매처 유형 — DOMESTIC(국내)/OVERSEAS(해외)/DUTYFREE(면세)';

ALTER TABLE deal_posts ADD COLUMN spirit_id BIGINT NULL COMMENT '연결된 술(spirit.id)',
                       ADD COLUMN store_type ENUM('DOMESTIC', 'OVERSEAS', 'DUTYFREE') NOT NULL DEFAULT 'DOMESTIC' COMMENT '판매처 유형 — DOMESTIC(국내)/OVERSEAS(해외)/DUTYFREE(면세)',
                       ADD CONSTRAINT fk_deal_posts_spirit_id FOREIGN KEY (spirit_id) REFERENCES spirit (id);
