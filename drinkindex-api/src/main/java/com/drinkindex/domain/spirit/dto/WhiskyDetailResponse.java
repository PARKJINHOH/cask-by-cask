package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.*;
import io.swagger.v3.oas.annotations.media.Schema;

public record WhiskyDetailResponse(

        @Schema(description = "위스키 스타일")
        WhiskyStyle style,

        @Schema(description = "병입 구분 (OB/IB)")
        BottlingType bottlingType,

        @Schema(description = "주 캐스크 종류")
        WhiskyCaskType caskType,

        @Schema(description = "숙성 방식")
        MaturationStyle maturationStyle,

        @Schema(description = "피니시 캐스크 종류")
        WhiskyCaskType finishCaskType,

        @Schema(description = "Non-Chill Filtered 여부")
        Boolean isNonChillFiltered,

        @Schema(description = "Natural Colour 여부")
        Boolean isNaturalColour,

        @Schema(description = "Single Cask 여부")
        Boolean isSingleCask,

        @Schema(description = "Cask Strength 여부")
        Boolean isCaskStrength,

        @Schema(description = "피팅 여부")
        Boolean isPeated,

        @Schema(description = "피트 강도 ppm")
        Integer phenolPpm,

        @Schema(description = "캐스크 번호")
        String caskNo,

        @Schema(description = "피니시 캐스크 추가 설명")
        String finishCaskDetail

) {}
