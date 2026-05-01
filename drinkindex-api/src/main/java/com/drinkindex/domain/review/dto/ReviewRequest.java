package com.drinkindex.domain.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
        @NotNull(message = "노즈 점수는 필수입니다.")
        @Min(value = 0, message = "점수는 0 이상이어야 합니다.")
        @Max(value = 100, message = "점수는 100 이하이어야 합니다.")
        Integer noseScore,

        @NotNull(message = "테이스트 점수는 필수입니다.")
        @Min(value = 0, message = "점수는 0 이상이어야 합니다.")
        @Max(value = 100, message = "점수는 100 이하이어야 합니다.")
        Integer tasteScore,

        @NotNull(message = "피니시 점수는 필수입니다.")
        @Min(value = 0, message = "점수는 0 이상이어야 합니다.")
        @Max(value = 100, message = "점수는 100 이하이어야 합니다.")
        Integer finishScore,

        @Size(max = 500, message = "코멘트는 500자 이내여야 합니다.")
        String comment
) {}
