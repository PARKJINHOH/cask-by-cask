package com.caskbycask.domain.venue.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** 국가 단위 묶음. 지도 앱의 국가 셀렉트와 /venues 허브가 함께 쓴다. */
public record VenueCountryResponse(
        @Schema(description = "국가 코드 (ISO 3166-1 alpha-2, 소문자)")
        String countryCode,
        @Schema(description = "이 국가의 공개 장소 수 (폐업 포함)")
        long venueCount,
        @Schema(description = "장소가 하나 이상 있는 도시 목록 (sortOrder 순)")
        List<VenueCityResponse> cities
) {
}
