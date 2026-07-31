package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;
import java.util.List;

public record UpdateSpiritRequest(

        @Schema(description = "한글 제품명 (null이면 변경 안 함)")
        String nameKo,

        @Schema(description = "영문 제품명 (null이면 변경 안 함)")
        String nameEn,

        @Schema(description = "카테고리 (null이면 변경 안 함)")
        SpiritCategory category,

        @Schema(description = "증류소 ID (null이면 변경 안 함)")
        Long producerId,

        @Schema(description = "빈티지 연도 (null이면 변경 안 함)")
        @Min(value = SpiritLimits.YEAR_MIN, message = "빈티지 연도는 1800년 이후여야 합니다.")
        @Max(value = SpiritLimits.YEAR_MAX, message = "빈티지 연도는 2100년 이하여야 합니다.")
        Integer vintageYear,

        @Schema(description = "알코올 도수 % (null이면 변경 안 함)")
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하이어야 합니다.")
        BigDecimal abv,

        @Schema(description = "용량 ml (null이면 변경 안 함)")
        @Min(value = SpiritLimits.VOLUME_ML_MIN, message = "용량은 1ml 이상이어야 합니다.")
        @Max(value = SpiritLimits.VOLUME_ML_MAX, message = "용량은 30000ml 이하여야 합니다.")
        Integer volumeMl,

        @Schema(description = "생산 국가 (null이면 변경 안 함)")
        String country,

        @Schema(description = "생산 지역 (null이면 변경 안 함)")
        String region,

        @Schema(description = "산지 코드 (WineRegion, 지도 표시용 — 와인·위스키·꼬냑·기타 공용). "
                + "abvMin/abvMax 와 동일하게 **null 은 '해제'** 로 반영된다(변경 안 함이 아님). "
                + "지정 시 생산 지역이 L1 산지명으로 자동 동기화됨",
                example = "FR_BORDEAUX_MEDOC")
        String regionCode,

        @Schema(description = "공통 상세 (null이면 변경 안 함)")
        @Valid SpiritCommonDetailRequest commonDetail,

        @Schema(description = "위스키 상세 (null이면 변경 안 함)")
        @Valid WhiskyDetailRequest whiskyDetail,

        @Schema(description = "와인 상세 (null이면 변경 안 함)")
        @Valid WineDetailRequest wineDetail,

        @Schema(description = "꼬냑 상세 (null이면 변경 안 함)")
        @Valid CognacDetailRequest cognacDetail,

        @Schema(description = "기타 상세 (null이면 변경 안 함)")
        @Valid OtherDetailRequest otherDetail,

        @Schema(description = "하위 에디션 분리 등록 여부")
        Boolean isVariantSplit,

        @Schema(description = "하위 에디션 목록")
        @Valid List<CreateVariantRequest> variants,

        @Schema(description = "에디션 유형")
        VariantType variantType,

        @Schema(description = "에디션 식별 값")
        String variantValue,

        @Schema(description = "에디션 식별 값(영문)")
        String variantValueEn,

        @Schema(description = "에디션 목록 표시용 시리즈 식별자")
        String seriesIdentifier,

        @Schema(description = "에디션 목록 표시용 시리즈 식별자(영문)")
        String seriesIdentifierEn,

        @Schema(description = "최소 도수")
        @DecimalMin(value = "0.0", message = "최소 도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "최소 도수는 100.0 이하이어야 합니다.")
        BigDecimal abvMin,

        @Schema(description = "최대 도수")
        @DecimalMin(value = "0.0", message = "최대 도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "최대 도수는 100.0 이하이어야 합니다.")
        BigDecimal abvMax,

        @Schema(description = "최소 용량")
        @Min(value = SpiritLimits.VOLUME_ML_MIN, message = "최소 용량은 1ml 이상이어야 합니다.")
        @Max(value = SpiritLimits.VOLUME_ML_MAX, message = "최소 용량은 30000ml 이하여야 합니다.")
        Integer volumeMlMin,

        @Schema(description = "최대 용량")
        @Min(value = SpiritLimits.VOLUME_ML_MIN, message = "최대 용량은 1ml 이상이어야 합니다.")
        @Max(value = SpiritLimits.VOLUME_ML_MAX, message = "최대 용량은 30000ml 이하여야 합니다.")
        Integer volumeMlMax
) {}
