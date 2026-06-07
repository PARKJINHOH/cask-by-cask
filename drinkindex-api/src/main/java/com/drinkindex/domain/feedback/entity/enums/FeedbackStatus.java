package com.drinkindex.domain.feedback.entity.enums;

/**
 * 개선·문의 처리 상태 (이슈 트래커 워크플로우).
 * RECEIVED(접수) → CONFIRMED(확인) → IN_PROGRESS(진행중) → RESOLVED(해결)
 * 또는 REJECTED(반려) / ON_HOLD(보류)
 */
public enum FeedbackStatus {
    RECEIVED,
    CONFIRMED,
    IN_PROGRESS,
    RESOLVED,
    REJECTED,
    ON_HOLD;

    /**
     * 상태 변경 시 제안할 기본 진척률(%). null 이면 기존 진척률 유지.
     */
    public Integer suggestedProgress() {
        return switch (this) {
            case RECEIVED -> 0;
            case CONFIRMED -> 25;
            case IN_PROGRESS -> 50;
            case RESOLVED -> 100;
            case REJECTED, ON_HOLD -> null; // 기존 값 유지
        };
    }
}
