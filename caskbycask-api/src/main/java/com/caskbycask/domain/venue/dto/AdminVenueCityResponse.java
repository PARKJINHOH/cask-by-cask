package com.caskbycask.domain.venue.dto;

import com.caskbycask.domain.venue.entity.VenueCity;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * 관리자 도시 응답.
 *
 * <p>공개 응답과 달리 노출을 끈 도시도 실리고, 삭제 가능 여부를 판단할 수 있도록
 * 장소 수를 함께 준다(장소가 있으면 삭제 대신 노출 끄기만 허용한다).
 */
public record AdminVenueCityResponse(
        @Schema(description = "도시 고유 ID")
        Long id,
        @Schema(description = "국가 코드 (ISO 3166-1 alpha-2, 소문자)")
        String countryCode,
        @Schema(description = "URL 세그먼트")
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
        @Schema(description = "국가 내 노출 순서")
        Integer sortOrder,
        @Schema(description = "노출 여부")
        boolean active,
        @Schema(description = "이 도시에 등록된 장소 수 (비공개 포함). 0 이 아니면 삭제할 수 없다")
        long venueCount
) {
    public static AdminVenueCityResponse from(VenueCity city, long venueCount) {
        return new AdminVenueCityResponse(
                city.getId(),
                city.getCountryCode(),
                city.getSlug(),
                city.getNameKo(),
                city.getNameEn(),
                city.getCenterLat(),
                city.getCenterLng(),
                city.getDefaultZoom(),
                city.getSortOrder(),
                Boolean.TRUE.equals(city.getIsActive()),
                venueCount
        );
    }
}
