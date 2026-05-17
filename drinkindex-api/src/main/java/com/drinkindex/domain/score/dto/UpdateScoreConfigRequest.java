package com.drinkindex.domain.score.dto;

public record UpdateScoreConfigRequest(
        Integer score,
        Integer dailyLimit,
        Boolean isActive,
        String description
) {
}
