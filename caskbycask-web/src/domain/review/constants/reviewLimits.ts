export const REVIEW_NOTE_MIN_LENGTH = 20
export const REVIEW_TEXT_MAX_LENGTH = 600

/**
 * 종합평가 HTML 저장 상한.
 *
 * 사용자에게 보이는 기준은 본문 600자(REVIEW_TEXT_MAX_LENGTH)이고, 이 값은 그 위에 얹히는
 * 서식 태그까지 감안한 안전장치다. 글자마다 색을 바꾸는 식으로 태그를 부풀린 입력을 막는다.
 * 서버 ReviewRequest/UpdateReviewRequest/CreateVariantReviewRequest 의 @Size 와 맞춰 둔다.
 */
export const REVIEW_COMMENT_HTML_MAX_LENGTH = 6000
