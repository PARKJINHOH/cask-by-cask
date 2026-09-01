/** 승인된 내 리뷰 수정 페이지 경로 */
export function myReviewEditPath(reviewId: number): string {
  return `/review/${reviewId}`
}

/** 승인 대기·리뷰 미승인 상태인 하위 에디션 요청 수정 페이지 경로 */
export function myReviewRequestEditPath(requestId: number): string {
  return `/review/request/${requestId}`
}

/**
 * 마이페이지 "내 리뷰" 탭 경로.
 * 헤더·모바일 하단탭·브레드크럼이 같은 주소를 써야 진입점끼리 어긋나지 않는다.
 */
export const MY_REVIEWS_PATH = '/mypage?tab=reviews'
