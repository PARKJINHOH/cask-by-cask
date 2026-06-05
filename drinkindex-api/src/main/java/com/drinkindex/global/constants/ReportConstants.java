package com.drinkindex.global.constants;

/**
 * [패치 6] 신고 임계치 일괄 관리.
 *
 * <p>의도적 차이: 술 리뷰·댓글은 콘텐츠 신뢰성이 중요해 더 엄격(3),
 * 게시판은 표현 자유를 고려해 완화(5).
 */
public final class ReportConstants {

    private ReportConstants() {}

    // [패치 6] 술 상세 리뷰 자동 숨김 임계치 (엄격)
    public static final int SPIRIT_REVIEW_HIDE_THRESHOLD = 3;

    // [패치 6] 술 상세 커뮤니티 댓글 자동 숨김 임계치 (엄격)
    public static final int SPIRIT_COMMENT_HIDE_THRESHOLD = 3;

    // [패치 6] 게시판 게시글 자동 잠금 임계치 (완화)
    public static final int POST_LOCK_THRESHOLD = 5;

    // [패치 6] 게시판 댓글 자동 숨김 임계치 (완화)
    public static final int COMMENT_HIDE_THRESHOLD = 5;
}
