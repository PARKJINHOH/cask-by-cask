package com.caskbycask.domain.score.dto;

import jakarta.validation.constraints.Min;

public record UpdateLevelConfigRequest(
        String name,
        @Min(0) Integer minScore,
        Boolean isActive
) {
}
