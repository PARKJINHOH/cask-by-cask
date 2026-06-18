package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

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

        @Schema(description = "병입업체명 (null이면 변경 안 함)")
        String bottler,

        @Schema(description = "병입 연도 (null이면 변경 안 함)")
        Integer bottledYear,

        @Schema(description = "빈티지 연도 (null이면 변경 안 함)")
        Integer vintageYear,

        @Schema(description = "알코올 도수 % (null이면 변경 안 함)")
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하이어야 합니다.")
        BigDecimal abv,

        @Schema(description = "용량 ml (null이면 변경 안 함)")
        Integer volumeMl,

        @Schema(description = "생산 국가 (null이면 변경 안 함)")
        String country,

        @Schema(description = "생산 지역 (null이면 변경 안 함)")
        String region,

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

        @Schema(description = "최소 도수")
        BigDecimal abvMin,

        @Schema(description = "최대 도수")
        BigDecimal abvMax
) {}
