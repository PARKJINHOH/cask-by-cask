ALTER TABLE spirit_whisky_detail
    MODIFY COLUMN phenol_ppm DECIMAL(5,1) NULL COMMENT '페놀 수치(ppm)',
    MODIFY COLUMN phenol_ppm_min DECIMAL(5,1) NULL COMMENT '최소 페놀 수치(ppm)',
    MODIFY COLUMN phenol_ppm_max DECIMAL(5,1) NULL COMMENT '최대 페놀 수치(ppm)';
