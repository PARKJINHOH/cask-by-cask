-- V25__add_spirit_volume_min_max.sql
ALTER TABLE spirit
    ADD COLUMN volume_ml_min INT NULL COMMENT '최소 용량(ml)',
    ADD COLUMN volume_ml_max INT NULL COMMENT '최대 용량(ml)';

UPDATE spirit SET volume_ml_min = volume_ml, volume_ml_max = volume_ml WHERE volume_ml IS NOT NULL;
