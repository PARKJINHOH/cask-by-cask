package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.OtherSpiritType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record OtherDetailRequest(

        @Schema(description = "기타 주종 (RUM, GIN, VODKA, TEQUILA, MEZCAL, BRANDY, LIQUEUR, SAKE, SOJU, BAIJIU, ABSINTHE, BEER, OTHER)")
        OtherSpiritType otherType,

        @Schema(description = "주원료 (예: 사탕수수, 곡물, 아가베)")
        @Size(max = 200, message = "주원료는 200자 이하여야 합니다.")
        String mainIngredient,

        @Schema(description = "제조 방식 (예: 단식 증류, 연속식 증류)")
        @Size(max = 200, message = "제조 방식은 200자 이하여야 합니다.")
        String productionMethod,

        @Schema(description = "추가 설명 / 비고")
        @Size(max = 500, message = "추가 설명은 500자 이하여야 합니다.")
        String notes,

        @Schema(description = "세부 스타일/분류 (예: Agricole, London Dry, Reposado, Junmai Daiginjo)")
        @Size(max = 100, message = "세부 스타일은 100자 이하여야 합니다.")
        String styleClassification,

        @Schema(description = "캐스크/우드 종류 (예: ex-Bourbon, ex-Sherry, 버진 오크)")
        @Size(max = 100, message = "캐스크 종류는 100자 이하여야 합니다.")
        String caskType,

        @Schema(description = "원산지 명칭/규정 (예: Tequila DOM, Calvados AOC)")
        @Size(max = 100, message = "원산지 명칭은 100자 이하여야 합니다.")
        String originDesignation

) {}
