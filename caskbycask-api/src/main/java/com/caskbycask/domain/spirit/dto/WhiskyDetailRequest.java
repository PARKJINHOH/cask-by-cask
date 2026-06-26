package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.*;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

import java.util.List;
import java.util.Map;

public record WhiskyDetailRequest(

        @Schema(description = "위스키 스타일 (SINGLE_MALT, BLENDED_MALT 등)")
        WhiskyStyle style,

        @Schema(description = "위스키 스타일 직접 입력 (style=OTHER 일 때만 유효)")
        @Size(max = 100, message = "스타일 직접 입력은 100자 이하여야 합니다.")
        String styleOther,

        @Schema(description = "브랜드명 (블렌디드 위스키 등 증류소와 별개의 상업적 브랜드)")
        @Size(max = 200, message = "브랜드명은 200자 이하여야 합니다.")
        String brandName,

        @Schema(description = "병입 구분 (OB=증류소 직접, IB=독립 병입사)")
        BottlingType bottlingType,

        @Schema(description = "사용된 캐스크 종류 (복수 선택 가능)")
        List<WhiskyCaskType> caskTypes,

        @Schema(description = "피니시(추가 숙성) 캐스크 종류 — caskTypes 의 부분집합")
        List<WhiskyCaskType> caskFinishes,

        @Schema(description = "캐스크 직접 입력 (caskTypes 에 OTHER 포함 시만 유효)")
        @Size(max = 200, message = "캐스크 직접 입력은 200자 이하여야 합니다.")
        String caskTypeOther,

        @Schema(description = "캐스크 상세 세부 정보 (대분류별 세부 명칭 리스트)")
        Map<WhiskyCaskType, List<String>> caskDetails,

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
        @DecimalMin(value = "0.0", message = "phenolPpm은 0 이상이어야 합니다.")
        @DecimalMax(value = "999.9", message = "phenolPpm은 999 이하이어야 합니다.")
        BigDecimal phenolPpm,

        @Schema(description = "최소 피트 강도 ppm")
        @DecimalMin(value = "0.0", message = "phenolPpmMin은 0 이상이어야 합니다.")
        @DecimalMax(value = "999.9", message = "phenolPpmMin은 999 이하이어야 합니다.")
        BigDecimal phenolPpmMin,

        @Schema(description = "최대 피트 강도 ppm")
        @DecimalMin(value = "0.0", message = "phenolPpmMax은 0 이상이어야 합니다.")
        @DecimalMax(value = "999.9", message = "phenolPpmMax은 999 이하이어야 합니다.")
        BigDecimal phenolPpmMax,

        @Schema(description = "캐스크 번호")
        @Size(max = 100, message = "캐스크 번호는 100자 이하여야 합니다.")
        String caskNo,

        @Schema(description = "기타 정보 (참고용 자유 입력)")
        @Size(max = 500, message = "기타 정보는 500자 이하여야 합니다.")
        String notes

) {}
