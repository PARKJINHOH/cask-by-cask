package com.caskbycask.domain.spirit.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record GrapeVarietyRequest(
        @NotBlank(message = "포도 품종명은 필수입니다.")
        String name,

        @Min(value = 1, message = "비율은 1 이상이어야 합니다.")
        @Max(value = 100, message = "비율은 100 이하이어야 합니다.")
        Integer percentage
) {}
