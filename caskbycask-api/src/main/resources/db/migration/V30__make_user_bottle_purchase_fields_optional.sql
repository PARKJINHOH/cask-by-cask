ALTER TABLE user_bottle
    MODIFY COLUMN purchase_date date NULL COMMENT '구매 일자',
    MODIFY COLUMN price integer NULL COMMENT '구매 가격(원)',
    MODIFY COLUMN store varchar(200) NULL COMMENT '구매처';
