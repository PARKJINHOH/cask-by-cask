ALTER TABLE spirit
    ADD COLUMN series_identifier_en VARCHAR(100) NULL COMMENT 'Series identifier for English edition list display' AFTER series_identifier;
