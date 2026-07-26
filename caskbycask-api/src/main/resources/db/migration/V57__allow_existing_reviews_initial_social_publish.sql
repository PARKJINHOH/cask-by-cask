ALTER TABLE review
    ADD COLUMN legacy_social_publish_allowed BIT NOT NULL DEFAULT b'1'
        COMMENT 'SNS 기능 도입 전 리뷰의 미게시 플랫폼 최초 발행 허용 여부';

ALTER TABLE review
    MODIFY COLUMN legacy_social_publish_allowed BIT NOT NULL DEFAULT b'0'
        COMMENT 'SNS 기능 도입 전 리뷰의 미게시 플랫폼 최초 발행 허용 여부';
