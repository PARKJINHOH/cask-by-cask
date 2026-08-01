package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.*;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

public record WineDetailRequest(

        @Schema(description = "와인 종류 (RED, WHITE, ROSE, SPARKLING, DESSERT, ORANGE, FORTIFIED)")
        WineType wineType,

        @Schema(description = "빈티지 상태 (VINTAGE, NON_VINTAGE, UNKNOWN)")
        WineVintageStatus vintageStatus,

        @Schema(description = "오크 숙성 여부")
        Boolean isOakAged,

        @Schema(description = "내추럴 와인 표방 여부 (통일된 국제 법적 인증과는 별개)")
        Boolean isNaturalWine,

        @Schema(description = "인증 등급 (ORGANIC, BIODYNAMIC, SUSTAINABLE, NONE)")
        WineCertification certification,

        @Schema(description = "포도 품종 목록 (비율 합계 ≤ 100)")
        @Valid
        List<GrapeVarietyRequest> grapeVarieties,

        @Schema(description = "원산지 명칭 (AOC, DOC, AVA 등 자유 입력)")
        @Size(max = 200, message = "원산지 명칭은 200자 이하여야 합니다.")
        String appellationDesignation,

        @Schema(description = "토양 종류")
        @Size(max = 100, message = "토양 종류는 100자 이하여야 합니다.")
        String soilType,

        @Schema(description = "포도밭 고도 (m)")
        @Min(value = 0, message = "고도는 0 이상이어야 합니다.")
        @Max(value = 5000, message = "고도는 5000m 이하여야 합니다.")
        Integer altitudeM,

        @Schema(description = "수확 방법 (Hand-picked / Machine-harvested 등)")
        @Size(max = 50, message = "수확 방법은 50자 이하여야 합니다.")
        String harvestMethod,

        @Schema(description = "발효 용기 종류")
        @Size(max = 100, message = "발효 용기는 100자 이하여야 합니다.")
        String fermentationVessel,

        @Schema(description = "오크 종류 (isOakAged=false 이면 무시)")
        @Size(max = 100, message = "오크 종류는 100자 이하여야 합니다.")
        String oakType,

        @Schema(description = "오크 숙성 개월 수 (isOakAged=false 이면 무시)")
        @Min(value = 1, message = "오크 숙성 개월 수는 1 이상이어야 합니다.")
        @Max(value = 600, message = "오크 숙성 개월 수는 600 이하여야 합니다.")
        Integer oakAgedMonths,

        @Schema(description = "당도 (DRY, OFF_DRY, MEDIUM, SWEET)")
        WineSweetness sweetness,

        @Schema(description = "바디 (LIGHT, MEDIUM, FULL)")
        WineBody body,

        @Schema(description = "산도 (LOW, MEDIUM, HIGH)")
        WineIntensity acidity,

        @Schema(description = "타닌 (LOW, MEDIUM, HIGH)")
        WineIntensity tannin,

        @Schema(description = "기타 정보 (출시·양조 관련 참고 설명)")
        @Size(max = 500, message = "기타 정보는 500자 이하여야 합니다.")
        String notes

) {}
