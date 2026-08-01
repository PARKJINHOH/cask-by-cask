package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.CognacCru;
import com.caskbycask.domain.spirit.entity.enums.CognacGrade;
import io.swagger.v3.oas.annotations.media.Schema;

public record CognacDetailResponse(

        @Schema(description = "꼬냑 등급")
        CognacGrade grade,

        @Schema(description = "크뤼 (원산지 세부 등급)")
        CognacCru cru,

        @Schema(description = "Fine Champagne 여부")
        Boolean isFineChampagne,

        @Schema(description = "블렌드 추가 설명")
        String blendDetail,

        @Schema(description = "빈티지 연도")
        Integer vintageYear,

        @Schema(description = "선언 숙성 연수 (년)")
        Integer ageYears,

        @Schema(description = "오크(우드) 종류")
        String oakType,

        @Schema(description = "캐스크 피니시 / 추가 숙성")
        String caskFinish,

        @Schema(description = "기타 정보")
        String notes

) {}
