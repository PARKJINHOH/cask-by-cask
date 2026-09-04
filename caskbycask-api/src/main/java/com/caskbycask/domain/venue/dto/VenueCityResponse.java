package com.caskbycask.domain.venue.dto;

import com.caskbycask.domain.venue.entity.VenueCity;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

public record VenueCityResponse(
        @Schema(description = "도시 고유 ID")
        Long id,
        @Schema(description = "국가 코드 (ISO 3166-1 alpha-2, 소문자)")
        String countryCode,
        @Schema(description = "URL 세그먼트 — /venues/{countryCode}/{slug}")
        String slug,
        @Schema(description = "도시명(한글)")
        String nameKo,
        @Schema(description = "도시명(영문)")
        String nameEn,
        @Schema(description = "지도 초기 중심 위도")
        BigDecimal centerLat,
        @Schema(description = "지도 초기 중심 경도")
        BigDecimal centerLng,
        @Schema(description = "지도 초기 줌 레벨")
        BigDecimal defaultZoom,
        @Schema(description = "이 도시의 공개 장소 수 (폐업 포함)")
        long venueCount
) {
    public static VenueCityResponse from(VenueCity city, long venueCount) {
        return new VenueCityResponse(
                city.getId(),
                city.getCountryCode(),
                city.getSlug(),
                city.getNameKo(),
                city.getNameEn(),
                city.getCenterLat(),
                city.getCenterLng(),
                city.getDefaultZoom(),
                venueCount
        );
    }
}
