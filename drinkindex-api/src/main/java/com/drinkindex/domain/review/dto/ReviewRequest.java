package com.drinkindex.domain.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ReviewRequest(
        @Schema(description = "향(Nose) 점수 (0.0~100.0, 소수점 1자리)")
        @NotNull(message = "노즈 점수는 필수입니다.")
        @DecimalMin(value = "0.0", message = "점수는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "점수는 100 이하이어야 합니다.")
        BigDecimal noseScore,

        @Schema(description = "맛(Taste) 점수 (0.0~100.0, 소수점 1자리)")
        @NotNull(message = "테이스트 점수는 필수입니다.")
        @DecimalMin(value = "0.0", message = "점수는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "점수는 100 이하이어야 합니다.")
        BigDecimal tasteScore,

        @Schema(description = "피니시(Finish) 점수 (0.0~100.0, 소수점 1자리)")
        @NotNull(message = "피니시 점수는 필수입니다.")
        @DecimalMin(value = "0.0", message = "점수는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "점수는 100 이하이어야 합니다.")
        BigDecimal finishScore,

        @Schema(description = "향 노트 (300자 이내, 선택)")
        @Size(max = 300, message = "향 노트는 300자 이내여야 합니다.")
        String noseNote,

        @Schema(description = "맛 노트 (300자 이내, 선택)")
        @Size(max = 300, message = "맛 노트는 300자 이내여야 합니다.")
        String tasteNote,

        @Schema(description = "피니시 노트 (300자 이내, 선택)")
        @Size(max = 300, message = "피니시 노트는 300자 이내여야 합니다.")
        String finishNote,

        @Schema(description = "기타 텍스트 코멘트 (500자 이내, 선택)")
        @Size(max = 500, message = "코멘트는 500자 이내여야 합니다.")
        String comment
) {}
