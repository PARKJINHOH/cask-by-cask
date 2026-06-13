package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.CognacCru;
import com.caskbycask.domain.spirit.entity.enums.CognacGrade;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record CognacDetailRequest(

        @Schema(description = "꼬냑 등급 (VS, NAPOLEON, VSOP, XO, XXO, HORS_DAGE)")
        CognacGrade grade,

        @Schema(description = "크뤼 (원산지 세부 등급 — Grande Champagne이 최상위)")
        CognacCru cru,

        @Schema(description = "Fine Champagne 여부 (Grande + Petite Champagne 블렌드, Grande 50%+)")
        Boolean isFineChampagne,

        @Schema(description = "블렌드 추가 설명")
        @Size(max = 300, message = "블렌드 설명은 300자 이하여야 합니다.")
        String blendDetail

) {}
