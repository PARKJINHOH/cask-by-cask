package com.drinkindex.domain.score.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdminAdjustRequest(
        @NotNull Long targetUserId,
        @NotNull Integer amount,
        @NotBlank String description
) {
}
