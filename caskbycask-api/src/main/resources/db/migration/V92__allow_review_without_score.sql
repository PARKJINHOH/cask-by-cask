-- 점수 없이도 리뷰를 쓸 수 있게 한다.
-- 점수는 "셋 다 있거나 셋 다 없거나" 둘 중 하나다 (부분 입력 금지 — 서비스 계층에서 막는다).
-- 셋 다 없으면 total_score 도 null 이고, 평균 산출(AVG)에서 자연히 빠진다.
alter table review
    modify column nose_score decimal(4,1) null,
    modify column taste_score decimal(4,1) null,
    modify column finish_score decimal(4,1) null,
    modify column total_score decimal(4,1) null;

alter table spirit_variant_review_request
    modify column nose_score decimal(4,1) null,
    modify column taste_score decimal(4,1) null,
    modify column finish_score decimal(4,1) null,
    modify column total_score decimal(4,1) null;

-- 평균 점수의 모수. review_count 는 "총 리뷰 수"(점수 없는 리뷰 포함) 라는 뜻을 그대로 유지하고,
-- 평점 옆 "리뷰 N개"·SEO aggregateRating.ratingCount 는 이 값을 쓴다.
alter table spirit
    add column scored_review_count integer not null default 0 comment '점수가 있는 리뷰 수(평균 산출 모수)';

-- 이 마이그레이션 이전 리뷰는 전부 점수가 있었다(NOT NULL 이었다).
update spirit set scored_review_count = review_count;
