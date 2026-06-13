package com.caskbycask.domain.score.dto;

import com.caskbycask.domain.score.entity.ScoreConfig;

import java.time.LocalDateTime;

public record ScoreConfigResponse(
        Long id,
        String actionType,
        Integer score,
        Integer dailyLimit,
        Boolean isActive,
        String description,
        LocalDateTime updatedAt
) {
    public static ScoreConfigResponse from(ScoreConfig config) {
        return new ScoreConfigResponse(
                config.getId(),
                config.getActionType(),
                config.getScore(),
                config.getDailyLimit(),
                config.getIsActive(),
                config.getDescription(),
                config.getUpdatedAt()
        );
    }
}
