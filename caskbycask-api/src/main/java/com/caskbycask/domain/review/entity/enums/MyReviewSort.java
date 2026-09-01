package com.caskbycask.domain.review.entity.enums;

/**
 * 마이페이지 "내 리뷰" 목록의 정렬 기준.
 *
 * <p>주류 상세의 공개 리뷰 목록이 쓰는 {@link ReviewSort} 를 확장하지 않고 따로 둔다.
 * 그쪽 switch 의 default 는 최신순이라, 값을 늘리면 {@code NAME_ASC} 같은 값이
 * 그 엔드포인트에서 조용히 최신순으로 떨어진다.</p>
 */
public enum MyReviewSort {
    LATEST,
    OLDEST,
    SCORE_DESC,
    SCORE_ASC,
    NAME_ASC,
    NAME_DESC
}
