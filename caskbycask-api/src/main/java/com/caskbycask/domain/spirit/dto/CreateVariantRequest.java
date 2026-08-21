package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.VariantType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateVariantRequest(
        @Schema(description = "기존 하위 에디션 ID (수정 시에만 사용, 신규 등록은 null)")
        Long id,

        @Schema(description = "하위 에디션 유형 (BATCH, RELEASE_YEAR, SINGLE_CASK, VINTAGE)")
        @NotNull(message = "에디션 유형은 필수입니다.")
        VariantType variantType,

        @Schema(description = "하위 에디션 식별 값")
        @NotBlank(message = "에디션 식별 값은 필수입니다.")
        @Size(max = 100, message = "에디션 식별 값은 100자 이하여야 합니다.")
        String variantValue,

        @Schema(description = "하위 에디션 식별 값(영문, 선택)")
        @Size(max = 100, message = "에디션 식별 값(영문)은 100자 이하여야 합니다.")
        String variantValueEn,

        @Schema(description = "에디션 목록 표시용 시리즈 식별자")
        @Size(max = 100, message = "시리즈 식별자는 100자 이하여야 합니다.")
        String seriesIdentifier,

        @Schema(description = "에디션 목록 표시용 시리즈 식별자(영문)")
        @Size(max = 100, message = "시리즈 식별자(영문)는 100자 이하여야 합니다.")
        String seriesIdentifierEn,

        @Schema(description = "알코올 도수")
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하여야 합니다.")
        BigDecimal abv,

        @Schema(description = "최소 알코올 도수 (범위)")
        @DecimalMin(value = "0.0", message = "최소 도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "최소 도수는 100.0 이하여야 합니다.")
        BigDecimal abvMin,

        @Schema(description = "최대 알코올 도수 (범위)")
        @DecimalMin(value = "0.0", message = "최대 도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "최대 도수는 100.0 이하여야 합니다.")
        BigDecimal abvMax,

        @Schema(description = "용량 ml")
        @Min(value = SpiritLimits.VOLUME_ML_MIN, message = "용량은 1ml 이상이어야 합니다.")
        @Max(value = SpiritLimits.VOLUME_ML_MAX, message = "용량은 30000ml 이하여야 합니다.")
        Integer volumeMl,

        @Schema(description = "최소 용량 (범위)")
        @Min(value = SpiritLimits.VOLUME_ML_MIN, message = "최소 용량은 1ml 이상이어야 합니다.")
        @Max(value = SpiritLimits.VOLUME_ML_MAX, message = "최소 용량은 30000ml 이하여야 합니다.")
        Integer volumeMlMin,

        @Schema(description = "최대 용량 (범위)")
        @Min(value = SpiritLimits.VOLUME_ML_MIN, message = "최대 용량은 1ml 이상이어야 합니다.")
        @Max(value = SpiritLimits.VOLUME_ML_MAX, message = "최대 용량은 30000ml 이하여야 합니다.")
        Integer volumeMlMax,

        @Schema(description = "와인 빈티지 연도 (variantType=VINTAGE, NON_VINTAGE이면 null)")
        @Min(value = SpiritLimits.YEAR_MIN, message = "빈티지 연도는 1800년 이후여야 합니다.")
        @Max(value = SpiritLimits.YEAR_MAX, message = "빈티지 연도는 2100년 이하여야 합니다.")
        Integer vintageYear,

        @Schema(description = "공통 상세 정보")
        @Valid SpiritCommonDetailRequest commonDetail,

        @Schema(description = "위스키 상세 정보")
        @Valid WhiskyDetailRequest whiskyDetail,

        @Schema(description = "와인 상세 정보 (variantType=VINTAGE)")
        @Valid WineDetailRequest wineDetail
) {}
