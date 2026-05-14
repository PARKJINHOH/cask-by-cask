package com.drinkindex.domain.cognacappellation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record UpdateCognacAppellationRequest(
        @Schema(description = "한글 산지명 (null이면 변경 안 함)")
        @Size(min = 1, max = 100)
        String nameKo,

        @Schema(description = "영문 산지명 (null이면 변경 안 함)")
        @Size(min = 1, max = 100)
        String nameEn,

        @Schema(description = "한글 소개 (null이면 변경 안 함)")
        String descriptionKo,

        @Schema(description = "영문 소개 (null이면 변경 안 함)")
        String descriptionEn
) {}
