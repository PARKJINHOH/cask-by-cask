package com.caskbycask.domain.review.constant;

/**
 * 리뷰 종합평가(comment) 길이 정책.
 *
 * <p>프론트 {@code caskbycask-web/src/domain/review/constants/reviewLimits.ts} 와 값을 맞춰 둔다.
 */
public final class ReviewCommentLimits {

    /**
     * 사용자에게 보이는 길이 기준 — 서식 태그를 걷어 낸 본문 기준이다.
     * 화면의 글자수 표시와 에디터 입력 제한이 모두 이 값을 쓴다.
     */
    public static final int MAX_TEXT_LENGTH = 600;

    /**
     * 저장 HTML 문자열의 상한.
     *
     * <p>본문 600자 위에 얹히는 서식 태그까지 감안한 안전장치다. 글자마다 색을 바꾸는 식으로
     * 태그를 부풀린 입력이 DB·응답을 키우는 것을 막는다. 본문 길이 검사는 별도로 한다.
     */
    public static final int MAX_HTML_LENGTH = 6000;

    private ReviewCommentLimits() {
    }
}
