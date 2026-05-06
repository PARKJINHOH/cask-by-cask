package com.drinkindex.domain.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateReviewRequest(
        @Schema(description = "향(Nose) 점수 (0~100, null이면 변경 안 함)")
        @Min(value = 0, message = "점수는 0 이상이어야 합니다.")
        @Max(value = 100, message = "점수는 100 이하이어야 합니다.")
        Integer noseScore,

        @Schema(description = "맛(Taste) 점수 (0~100, null이면 변경 안 함)")
        @Min(value = 0, message = "점수는 0 이상이어야 합니다.")
        @Max(value = 100, message = "점수는 100 이하이어야 합니다.")
        Integer tasteScore,

        @Schema(description = "피니시(Finish) 점수 (0~100, null이면 변경 안 함)")
        @Min(value = 0, message = "점수는 0 이상이어야 합니다.")
        @Max(value = 100, message = "점수는 100 이하이어야 합니다.")
        Integer finishScore,

        @Schema(description = "텍스트 코멘트 (500자 이내, null이면 변경 안 함)")
        @Size(max = 500, message = "코멘트는 500자 이내여야 합니다.")
        String comment
) {}
