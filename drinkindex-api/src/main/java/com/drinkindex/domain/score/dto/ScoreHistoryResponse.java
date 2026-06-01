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
        LocalDateTime createdAt
) {
    public static ScoreHistoryResponse from(ScoreHistory history) {
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
                history.getCreatedAt()
        );
    }
}
