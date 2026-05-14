package com.drinkindex.domain.cognacappellation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCognacAppellationRequest(
        @Schema(description = "한글 산지명")
        @NotBlank(message = "한국어 산지명을 입력해주세요.")
        @Size(max = 100)
        String nameKo,

        @Schema(description = "영문 산지명")
        @NotBlank(message = "영문 산지명을 입력해주세요.")
        @Size(max = 100)
        String nameEn,

        @Schema(description = "한글 소개 (선택)")
        String descriptionKo,

        @Schema(description = "영문 소개 (선택)")
        String descriptionEn
) {}
