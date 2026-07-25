-- 해외·면세 가격은 원 통화 금액을 보존하면서 등록 당시 원화 환산값을 별도로 저장한다.
ALTER TABLE price_reports
    MODIFY COLUMN currency ENUM ('CNY','EUR','JPY','KRW','TWD','USD') NOT NULL
        COMMENT '입력 통화 — KRW/TWD/USD/JPY/CNY/EUR',
    MODIFY COLUMN exchange_rate_snapshot DECIMAL(18,8) NULL
        COMMENT '외화 1단위당 원화 환율 스냅샷',
    ADD COLUMN actual_price_krw DECIMAL(14,0) NULL
        COMMENT '등록 당시 환율 기준 원화 실구매가'
        AFTER actual_price,
    ADD COLUMN price_input_mode VARCHAR(20) NULL
        COMMENT '가격 입력 방식 — AUTO_CONVERTED/KRW_DIRECT'
        AFTER actual_price_krw,
    ADD COLUMN exchange_rate_date DATE NULL
        COMMENT '자동 환율 기준일'
        AFTER exchange_rate_snapshot;

-- 기존 KRW는 금액을 그대로, 기존 USD는 저장된 환율 스냅샷으로 원화값을 복원한다.
UPDATE price_reports
SET actual_price_krw = CASE
        WHEN actual_price IS NULL THEN NULL
        WHEN currency = 'KRW' THEN ROUND(actual_price)
        WHEN exchange_rate_snapshot IS NOT NULL THEN ROUND(actual_price * exchange_rate_snapshot)
        ELSE NULL
    END,
    price_input_mode = CASE
        WHEN currency = 'KRW' THEN 'KRW_DIRECT'
        ELSE 'AUTO_CONVERTED'
    END
WHERE price_input_mode IS NULL OR actual_price_krw IS NULL;

ALTER TABLE price_reports
    MODIFY COLUMN price_input_mode VARCHAR(20) NOT NULL
        COMMENT '가격 입력 방식 — AUTO_CONVERTED/KRW_DIRECT';

CREATE TABLE exchange_rates (
    currency VARCHAR(10) NOT NULL COMMENT '외화 ISO 코드',
    krw_per_unit DECIMAL(18,8) NOT NULL COMMENT '외화 1단위당 원화 환율',
    provider VARCHAR(50) NOT NULL COMMENT '환율 제공자',
    effective_date DATE NOT NULL COMMENT '제공자 환율 기준일',
    fetched_at DATETIME(6) NOT NULL COMMENT '마지막 정상 수집 일시',
    PRIMARY KEY (currency)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='가격 등록용 최신 원화 환율 캐시';
