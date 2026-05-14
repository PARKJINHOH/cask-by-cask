package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.CognacCru;
import com.drinkindex.domain.spirit.entity.enums.CognacGrade;
import io.swagger.v3.oas.annotations.media.Schema;

public record CognacDetailResponse(

        @Schema(description = "꼬냑 등급")
        CognacGrade grade,

        @Schema(description = "크뤼 (원산지 세부 등급)")
        CognacCru cru,

        @Schema(description = "Fine Champagne 여부")
        Boolean isFineChampagne,

        @Schema(description = "블렌드 추가 설명")
        String blendDetail

) {}
