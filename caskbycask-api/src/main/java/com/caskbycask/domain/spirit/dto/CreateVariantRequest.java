package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.VariantType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreateVariantRequest(
        @Schema(description = "에디션 유형 (BATCH, RELEASE_YEAR, SINGLE_CASK)")
        @NotNull(message = "에디션 유형은 필수입니다.")
        VariantType variantType,

        @Schema(description = "에디션 식별 값 (예: Batch 10)")
        String variantValue,

        @Schema(description = "알코올 도수")
        BigDecimal abv,

        @Schema(description = "최소 알코올 도수 (범위)")
        BigDecimal abvMin,

        @Schema(description = "최대 알코올 도수 (범위)")
        BigDecimal abvMax,

        @Schema(description = "용량 ml")
        Integer volumeMl,

        @Schema(description = "공통 상세 정보 (용량, 도수 및 기타 필드)")
        @Valid SpiritCommonDetailRequest commonDetail,

        @Schema(description = "위스키 상세 (캐스크 등 에디션별 고유 필드)")
        @Valid WhiskyDetailRequest whiskyDetail
) {}
