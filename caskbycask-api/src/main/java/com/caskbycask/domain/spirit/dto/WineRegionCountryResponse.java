package com.caskbycask.domain.spirit.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "와인 산지 국가 — 국가별 L1 산지 트리")
public record WineRegionCountryResponse(
        @Schema(description = "ISO 3166-1 alpha-2 국가 코드", example = "FR")
        String countryCode,

        @Schema(description = "L1 대산지 목록 (children 에 L2 포함)")
        List<WineRegionResponse> regions
) {
}
