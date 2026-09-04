package com.caskbycask.domain.report.entity.enums;

/**
 * 신고 대상 유형.
 *
 * <p>값을 추가하면 {@code ReportService} 의 exhaustive switch 여섯 곳이 모두 컴파일 에러가 난다.
 * 그게 의도다 — 임계치·숨김·복구·자가신고·존재확인·미리보기 중 하나라도 빠뜨리면
 * 신고는 접수되는데 아무 일도 일어나지 않는 상태가 된다.
 */
public enum ReportTargetType {
    /** 주류 리뷰 */
    REVIEW,
    /** 주류 상세의 커뮤니티 댓글 */
    COMMENT,
    /** 주류 이미지 */
    IMAGE,
    /** 장소(바·보틀샵) 방문 후기 댓글 */
    VENUE_COMMENT
}
