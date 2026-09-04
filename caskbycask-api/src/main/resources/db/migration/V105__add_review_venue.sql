-- 리뷰에 "마신 곳" 태그.
--
-- 이 기능의 핵심이다. 바 사장님에게 판매 주류 목록을 갱신시키면 금방 상하고 아무도 안 고친다.
-- 대신 사용자가 리뷰를 쓸 때 마신 곳을 고르게 하면, 바↔술 그래프가 저절로 채워지고
-- 오래된 것은 신선도 컷으로 자연히 빠진다. 사장님의 유지보수 비용은 0 이다.
--
-- 이 컬럼 하나로 두 화면이 생긴다:
--   주류 상세 "이 술을 마실 수 있는 곳"  — 구매의도가 가장 높은 지점에서 업소로 보낸다
--   장소 상세 "여기서 리뷰된 술"          — 사장님이 못 만드는 그 보틀 리스트
--
-- FK 는 걸지 않는다(V100 이후 규약). 장소가 지워져도 리뷰 본문은 그대로 살아 있어야 하므로
-- 여기서는 정리하지 않고, 조회 시 venue 의 status/deleted_at 으로 걸러 태그만 조용히 감춘다
-- (VenueAdminService.delete 주석 참고).
ALTER TABLE review
    ADD COLUMN venue_id BIGINT NULL COMMENT '마신 곳(venue.id)' AFTER user_id;

CREATE INDEX idx_review_venue_id ON review (venue_id);
