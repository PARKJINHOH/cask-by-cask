-- 리뷰 입력 정책을 600자로 통일한다.
-- 운영 데이터에 600자를 초과하는 값이 없음을 확인한 뒤 적용하는 축소 마이그레이션이다.
ALTER TABLE review
    MODIFY COLUMN nose_note VARCHAR(600) NULL,
    MODIFY COLUMN taste_note VARCHAR(600) NULL,
    MODIFY COLUMN finish_note VARCHAR(600) NULL,
    MODIFY COLUMN `comment` VARCHAR(600) NULL;

ALTER TABLE spirit_variant_review_request
    MODIFY COLUMN nose_note VARCHAR(600) NULL,
    MODIFY COLUMN taste_note VARCHAR(600) NULL,
    MODIFY COLUMN finish_note VARCHAR(600) NULL,
    MODIFY COLUMN `comment` VARCHAR(600) NULL;
