-- 테이스팅 노트(향/맛/피니시)와 총평을 1000자까지 작성할 수 있도록 확장한다.
-- 컬럼 확장(varchar 길이 증가)이므로 기존 데이터는 그대로 유지된다.
ALTER TABLE review
    MODIFY COLUMN nose_note VARCHAR(1000) NULL,
    MODIFY COLUMN taste_note VARCHAR(1000) NULL,
    MODIFY COLUMN finish_note VARCHAR(1000) NULL,
    MODIFY COLUMN `comment` VARCHAR(1000) NULL;

-- 하위 에디션 리뷰 요청은 승인 시 review 로 그대로 복사되므로 동일 길이를 유지한다.
ALTER TABLE spirit_variant_review_request
    MODIFY COLUMN nose_note VARCHAR(1000) NULL,
    MODIFY COLUMN taste_note VARCHAR(1000) NULL,
    MODIFY COLUMN finish_note VARCHAR(1000) NULL,
    MODIFY COLUMN `comment` VARCHAR(1000) NULL;
