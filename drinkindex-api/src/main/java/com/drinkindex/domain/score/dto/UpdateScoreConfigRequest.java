package com.drinkindex.domain.score.dto;

public record UpdateScoreConfigRequest(
        String actionType,
        Integer score,
        Integer dailyLimit,
        Boolean isActive,
        String description
) {
}
