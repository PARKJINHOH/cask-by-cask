package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateSpiritRequest(

        @Schema(description = "한글 제품명")
        @NotBlank(message = "한글 이름은 필수입니다.") String nameKo,

        @Schema(description = "영문 제품명")
        @NotBlank(message = "영문 이름은 필수입니다.") String nameEn,

        @Schema(description = "카테고리 (WHISKY, COGNAC, WINE, OTHER)")
        @NotNull(message = "카테고리는 필수입니다.") SpiritCategory category,

        @Schema(description = "증류소 ID (선택)")
        Long distilleryId,

        @Schema(description = "병입업체명 (독립 병입인 경우)")
        String bottler,

        @Schema(description = "병입 연도")
        Integer bottledYear,

        @Schema(description = "빈티지 연도 (원액 수확 연도)")
        Integer vintageYear,

        @Schema(description = "알코올 도수 % (0.0~100.0)")
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하이어야 합니다.")
        BigDecimal abv,

        @Schema(description = "용량 ml")
        Integer volumeMl,

        @Schema(description = "생산 국가")
        String country,

        @Schema(description = "생산 지역")
        String region,

        @Schema(description = "공통 상세 정보 (모든 카테고리)")
        @Valid SpiritCommonDetailRequest commonDetail,

        @Schema(description = "위스키 상세 (category=WHISKY 일 때)")
        @Valid WhiskyDetailRequest whiskyDetail,

        @Schema(description = "와인 상세 (category=WINE 일 때)")
        @Valid WineDetailRequest wineDetail,

        @Schema(description = "꼬냑 상세 (category=COGNAC 일 때)")
        @Valid CognacDetailRequest cognacDetail,

        @Schema(description = "기타 상세 (category=OTHER 일 때)")
        @Valid OtherDetailRequest otherDetail

) {}
