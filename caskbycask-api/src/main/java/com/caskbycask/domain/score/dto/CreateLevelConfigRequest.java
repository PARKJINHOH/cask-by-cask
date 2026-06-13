package com.caskbycask.domain.score.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateLevelConfigRequest(
        @NotNull @Min(1) Integer level,
        @NotBlank String name,
        @NotNull @Min(0) Integer minScore
) {
}
