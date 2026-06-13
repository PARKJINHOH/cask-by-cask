package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.*;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record WineDetailResponse(

        @Schema(description = "와인 종류")
        WineType wineType,

        @Schema(description = "빈티지 연도")
        Integer vintage,

        @Schema(description = "오크 숙성 여부")
        Boolean isOakAged,

        @Schema(description = "내추럴 와인 여부")
        Boolean isNaturalWine,

        @Schema(description = "인증 등급")
        WineCertification certification,

        @Schema(description = "포도 품종 목록")
        List<GrapeVarietyResponse> grapeVarieties,

        @Schema(description = "원산지 명칭 (AOC, DOC 등)")
        String appellationDesignation,

        @Schema(description = "토양 종류")
        String soilType,

        @Schema(description = "포도밭 고도 (m)")
        Integer altitudeM,

        @Schema(description = "수확 방법")
        String harvestMethod,

        @Schema(description = "발효 용기")
        String fermentationVessel,

        @Schema(description = "오크 종류")
        String oakType,

        @Schema(description = "오크 숙성 개월 수")
        Integer oakAgedMonths

) {}
