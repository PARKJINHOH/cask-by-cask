package com.drinkindex.domain.user.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SuspendUserRequest(
        @NotNull @Min(1) @Max(365)
        Integer days,
        @NotBlank @Size(max = 500)
        String reason
) {}
