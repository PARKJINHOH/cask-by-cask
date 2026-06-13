package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.OtherSpiritType;
import io.swagger.v3.oas.annotations.media.Schema;

public record OtherDetailResponse(

        @Schema(description = "기타 주종")
        OtherSpiritType otherType,

        @Schema(description = "주원료")
        String mainIngredient,

        @Schema(description = "제조 방식")
        String productionMethod,

        @Schema(description = "추가 설명 / 비고")
        String notes

) {}
