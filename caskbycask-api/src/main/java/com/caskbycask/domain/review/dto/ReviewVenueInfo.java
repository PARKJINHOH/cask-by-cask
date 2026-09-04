package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.venue.entity.Venue;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 리뷰에 붙은 "마신 곳" 요약.
 *
 * <p>장소가 숨겨지거나 삭제됐으면 {@code null} 을 돌려준다 — 리뷰 자체는 살아 있어야 하므로
 * 에러가 아니라 <b>태그만 조용히 사라지는</b> 것이 맞다.
 */
public record ReviewVenueInfo(
        @Schema(description = "장소 고유 ID")
        Long venueId,
        @Schema(description = "장소명(한글)")
        String nameKo,
        @Schema(description = "장소명(영문). 없으면 null")
        String nameEn,
        @Schema(description = "도시명(한글)")
        String cityNameKo,
        @Schema(description = "도시명(영문)")
        String cityNameEn,
        @Schema(description = "국가 코드 (ISO 3166-1 alpha-2, 소문자)")
        String countryCode
) {
    public static ReviewVenueInfo from(Venue venue) {
        if (venue == null || venue.getDeletedAt() != null || venue.getStatus() == VenueStatus.HIDDEN) {
            return null;
        }
        return new ReviewVenueInfo(
                venue.getId(),
                venue.getNameKo(),
                venue.getNameEn(),
                venue.getCity().getNameKo(),
                venue.getCity().getNameEn(),
                venue.getCountryCode()
        );
    }
}
