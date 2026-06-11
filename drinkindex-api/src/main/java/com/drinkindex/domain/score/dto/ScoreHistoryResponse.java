package com.drinkindex.domain.score.dto;

import com.drinkindex.domain.score.entity.ScoreHistory;

import java.time.LocalDateTime;

public record ScoreHistoryResponse(
        Long id,
        Long userId,
        String nickname,
        String actionType,
        Integer score,
        Integer balanceAfter,
        String referenceType,
        Long referenceId,
        String description,
        // 점수를 획득/차감한 출처로 이동하는 프론트 경로. 매핑 불가 항목은 null.
        String linkUrl,
        LocalDateTime createdAt
) {
    public static ScoreHistoryResponse from(ScoreHistory history) {
        return from(history, null);
    }

    public static ScoreHistoryResponse from(ScoreHistory history, String linkUrl) {
        return new ScoreHistoryResponse(
                history.getId(),
                history.getUser().getId(),
                history.getUser().getNickname(),
                history.getActionType(),
                history.getScore(),
                history.getBalanceAfter(),
                history.getReferenceType(),
                history.getReferenceId(),
                history.getDescription(),
                linkUrl,
                history.getCreatedAt()
        );
    }
}
