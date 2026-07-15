ALTER TABLE inquiry
    MODIFY COLUMN body MEDIUMTEXT NOT NULL COMMENT '문의 내용(정제된 HTML)',
    CHANGE COLUMN image_urls attachment_data MEDIUMTEXT NULL
        COMMENT '첨부파일 메타데이터(JSON, V42 이전 데이터는 이미지 URL 목록)';
