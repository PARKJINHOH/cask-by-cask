package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.*;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record WhiskyDetailRequest(

        @Schema(description = "위스키 스타일 (SINGLE_MALT, BLENDED_MALT 등)")
        WhiskyStyle style,

        @Schema(description = "병입 구분 (OB=증류소 직접, IB=독립 병입사)")
        BottlingType bottlingType,

        @Schema(description = "캐스크 종류")
        WhiskyCaskType caskType,

        @Schema(description = "숙성 방식 (FULL_MATURATION=단일 캐스크, FINISH=이중 숙성)")
        MaturationStyle maturationStyle,

        @Schema(description = "피니시 캐스크 종류 (maturationStyle=FINISH 일 때만 유효)")
        WhiskyCaskType finishCaskType,

        @Schema(description = "Non-Chill Filtered 여부 (저온 여과 생략 → 풍미 보존)")
        Boolean isNonChillFiltered,

        @Schema(description = "Natural Colour 여부 (캐러멜 색소 E150a 무첨가)")
        Boolean isNaturalColour,

        @Schema(description = "Single Cask 여부")
        Boolean isSingleCask,

        @Schema(description = "Cask Strength 여부 (가수 없이 원액 병입)")
        Boolean isCaskStrength,

        @Schema(description = "피팅 여부 (피트/이탄 사용)")
        Boolean isPeated,

        @Schema(description = "피트 강도 ppm (isPeated=true 일 때만 유효)")
        @Min(value = 0, message = "phenolPpm은 0 이상이어야 합니다.")
        @Max(value = 300, message = "phenolPpm은 300 이하이어야 합니다.")
        Integer phenolPpm,

        @Schema(description = "캐스크 번호")
        @Size(max = 100, message = "캐스크 번호는 100자 이하여야 합니다.")
        String caskNo,

        @Schema(description = "피니시 캐스크 추가 설명")
        @Size(max = 200, message = "피니시 캐스크 설명은 200자 이하여야 합니다.")
        String finishCaskDetail

) {}
