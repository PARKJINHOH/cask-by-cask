package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.*;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record WhiskyDetailResponse(

        @Schema(description = "위스키 스타일")
        WhiskyStyle style,

        @Schema(description = "위스키 스타일 직접 입력 (style=OTHER 일 때)")
        String styleOther,

        @Schema(description = "브랜드명 (블렌디드 위스키 등 증류소와 별개의 상업적 브랜드)")
        String brandName,

        @Schema(description = "병입 구분 (OB/IB)")
        BottlingType bottlingType,

        @Schema(description = "사용된 캐스크 종류 (복수)")
        List<WhiskyCaskType> caskTypes,

        @Schema(description = "피니시(추가 숙성) 캐스크 종류 — caskTypes 의 부분집합")
        List<WhiskyCaskType> caskFinishes,

        @Schema(description = "캐스크 직접 입력 (caskTypes 에 OTHER 포함 시)")
        String caskTypeOther,

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

        @Schema(description = "기타 정보 (참고용 자유 입력)")
        String notes

) {}
