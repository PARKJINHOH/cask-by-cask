package com.caskbycask.domain.spirit.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "국가별 등록 술 수 통계")
public record CountryStatsResponse(
        @Schema(description = "국가명 (정규화된 한국어 표기)")
        String country,
        @Schema(description = "ACTIVE 상태 술 개수")
        long count
) {}
