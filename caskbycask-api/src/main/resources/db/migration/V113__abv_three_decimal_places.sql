-- 도수(ABV)를 소수점 셋째 자리까지 저장한다.
--
-- 배경
--  - 컬럼이 decimal(4,1) 이라 43.75% 를 넣으면 MySQL 이 조용히 43.8 로 반올림해 저장했다.
--    화면에는 입력한 값이 남아 있다가 저장 후 다시 불러오면 값이 바뀌어 있어 "왜 반올림되냐"가 된다.
--  - 캐스크 스트렝스는 라벨에 60.35% 처럼 소수점 아래가 찍힌다. 첫째 자리로 깎으면 라벨과 다른 술이 된다.
--
-- decimal(6,3) 으로 넓힌다 — 정수부 3자리(0~100)+소수부 3자리. 기존 값은 46.3 → 46.300 으로 그대로 살아남는다
-- (자릿수를 넓히기만 하므로 손실이 없다).

-- 1) 마스터/에디션 도수 및 도수 범위
alter table spirit
    modify column abv     decimal(6,3) null comment '도수(%)',
    modify column abv_min decimal(6,3) null comment '최소 도수(%)',
    modify column abv_max decimal(6,3) null comment '최대 도수(%)';

-- 2) 공통 상세의 도수
alter table spirit_common_detail
    modify column abv decimal(6,3) null comment '도수(%)';

-- 3) 사용자 에디션 등록 요청의 도수 (요청 시 필수라 not null 유지)
alter table spirit_variant_review_request
    modify column abv decimal(6,3) not null;
