package com.caskbycask.domain.spirit.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "지역별 등록 술 수 통계")
public record RegionStatsResponse(
        @Schema(description = "지역명")
        String region,
        @Schema(description = "ACTIVE 상태 술 개수")
        long count
) {}
