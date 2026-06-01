package com.drinkindex.domain.score.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateScoreConfigRequest(
        @NotBlank @Size(max = 50) String actionType,
        @NotNull Integer score,
        Integer dailyLimit,
        Boolean isActive,
        String description
) {
}
