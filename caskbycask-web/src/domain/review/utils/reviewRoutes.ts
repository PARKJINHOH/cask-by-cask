/** 승인된 내 리뷰 수정 페이지 경로 */
export function myReviewEditPath(reviewId: number): string {
  return `/review/${reviewId}`
}

/** 승인 대기·리뷰 미승인 상태인 하위 에디션 요청 수정 페이지 경로 */
export function myReviewRequestEditPath(requestId: number): string {
  return `/review/request/${requestId}`
}
