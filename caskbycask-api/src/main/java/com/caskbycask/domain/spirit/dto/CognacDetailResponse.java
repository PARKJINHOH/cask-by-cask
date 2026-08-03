package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.CognacCru;
import com.caskbycask.domain.spirit.entity.enums.CognacGrade;
import com.caskbycask.domain.spirit.entity.enums.CognacOakType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record CognacDetailResponse(

        @Schema(description = "꼬냑 등급")
        CognacGrade grade,

        @Schema(description = "대표 크뤼 (크뤼 구성 중 비율이 가장 높은 것)")
        CognacCru cru,

        @Schema(description = "크뤼 구성. 1개면 싱글 크뤼, 2개 이상이면 멀티 크뤼 블렌드")
        List<CruCompositionResponse> cruComposition,

        @Schema(description = "Fine Champagne 여부")
        Boolean isFineChampagne,

        @Schema(description = "블렌드 추가 설명")
        String blendDetail,

        @Schema(description = "빈티지 연도")
        Integer vintageYear,

        @Schema(description = "선언 숙성 연수 (년)")
        Integer ageYears,

        @Schema(description = "오크 산지 — 프렌치 오크가 자란 지역 (복수)")
        List<CognacOakType> oakTypes,

        @Schema(description = "캐스크 피니시 / 추가 숙성")
        String caskFinish,

        @Schema(description = "기타 정보")
        String notes

) {}
