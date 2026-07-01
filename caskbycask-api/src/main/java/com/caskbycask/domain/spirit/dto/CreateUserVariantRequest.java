package com.caskbycask.domain.spirit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserVariantRequest(
        @Schema(description = "사용자가 추가하는 하위 에디션 식별 값")
        @NotBlank(message = "에디션 식별 값은 필수입니다.")
        @Size(max = 100, message = "에디션 식별 값은 100자 이하여야 합니다.")
        String variantValue,

        @Schema(description = "사용자가 추가하는 하위 에디션 식별 값(영문)")
        @Size(max = 100, message = "에디션 식별 값(영문)은 100자 이하여야 합니다.")
        String variantValueEn
) {}
