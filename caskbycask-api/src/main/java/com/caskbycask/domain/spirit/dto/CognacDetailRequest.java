package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.CognacCru;
import com.caskbycask.domain.spirit.entity.enums.CognacGrade;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
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
        String blendDetail,

        @Schema(description = "빈티지 연도 (빈티지 꼬냑)")
        @Min(value = 1800, message = "빈티지 연도는 1800년 이후여야 합니다.")
        Integer vintageYear,

        @Schema(description = "선언 숙성 연수 (년)")
        @Min(value = 0, message = "숙성 연수는 0 이상이어야 합니다.")
        Integer ageYears,

        @Schema(description = "오크(우드) 종류 (LIMOUSIN, TRONCAIS, ALLIER, OTHER)")
        @Size(max = 30, message = "오크 종류 값이 올바르지 않습니다.")
        String oakType,

        @Schema(description = "캐스크 피니시 / 추가 숙성 (자유 입력)")
        @Size(max = 200, message = "캐스크 피니시는 200자 이하여야 합니다.")
        String caskFinish,

        @Schema(description = "기타 정보 (출시·숙성 관련 참고 설명)")
        @Size(max = 500, message = "기타 정보는 500자 이하여야 합니다.")
        String notes

) {}
