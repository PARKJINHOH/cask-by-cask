-- 리뷰 종합평가(comment)를 제한형 에디터의 HTML 로 저장한다.
-- 굵기/밑줄/글자색/형광펜/글자크기 태그가 붙으면 본문 600자만으로도 VARCHAR(600) 을 넘긴다.
--
-- 기존 값은 건드리지 않는다 — 에디터 도입 이전 리뷰는 순수 텍스트로 남고, 화면에서 읽는 시점에
-- HTML 로 감싼다(reviewRichText.reviewCommentToHtml). 데이터를 일괄 변환하면 되돌릴 수 없고
-- 변환이 어긋나면 기존 리뷰 전체가 깨진다.
--
-- 향/맛/피니시 노트는 순수 텍스트 그대로이므로 VARCHAR(600) 을 유지한다.
ALTER TABLE review
    MODIFY COLUMN `comment` TEXT NULL;

-- 하위 에디션 리뷰 요청은 승인 시 review 로 그대로 복사되므로 같은 타입을 유지한다.
ALTER TABLE spirit_variant_review_request
    MODIFY COLUMN `comment` TEXT NULL;
