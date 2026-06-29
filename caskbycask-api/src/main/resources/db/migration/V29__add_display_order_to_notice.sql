ALTER TABLE notice ADD COLUMN display_order INT NOT NULL DEFAULT 0 COMMENT '노출 순서 (높을수록 우선)';
