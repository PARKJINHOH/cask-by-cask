ALTER TABLE user_bottle
    ADD COLUMN volume_ml INT NULL COMMENT '보틀 용량(ml)' AFTER store;
