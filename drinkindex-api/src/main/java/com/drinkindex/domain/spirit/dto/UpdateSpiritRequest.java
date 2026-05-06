package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record UpdateSpiritRequest(
        @Schema(description = "한글 제품명 (null이면 변경 안 함)")
        String nameKo,
        @Schema(description = "영문 제품명 (null이면 변경 안 함)")
        String nameEn,
        @Schema(description = "카테고리 (null이면 변경 안 함)")
        SpiritCategory category,
        @Schema(description = "증류소 ID (null이면 변경 안 함)")
        Long distilleryId,
        @Schema(description = "병입업체명 (null이면 변경 안 함)")
        String bottler,
        @Schema(description = "병입 연도 (null이면 변경 안 함)")
        Integer bottledYear,
        @Schema(description = "빈티지 연도 (null이면 변경 안 함)")
        Integer vintageYear,
        @Schema(description = "알코올 도수 % (0.0~100.0, null이면 변경 안 함)")
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하이어야 합니다.")
        BigDecimal abv,
        @Schema(description = "용량 ml (null이면 변경 안 함)")
        Integer volumeMl,
        @Schema(description = "생산 국가 (null이면 변경 안 함)")
        String country,
        @Schema(description = "생산 지역 (null이면 변경 안 함)")
        String region
) {}
