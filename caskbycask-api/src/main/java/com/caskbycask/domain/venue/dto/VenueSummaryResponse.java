package com.caskbycask.domain.venue.dto;

import com.caskbycask.domain.venue.entity.Venue;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.entity.enums.VenueType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * 목록·지도 마커용 축약형.
 *
 * <p>{@code lat/lng} 이 null 인 행이 섞일 수 있다(좌표 없이 등록된 뒤 아직 ACTIVE 가 아닌 장소).
 * 마커를 만드는 쪽에서 반드시 걸러야 한다 — 서버도 {@code mappable} 로 미리 알려 준다.
 */
public record VenueSummaryResponse(
        @Schema(description = "장소 고유 ID")
        Long id,
        @Schema(description = "장소 유형 (BAR/BOTTLE_SHOP/OTHER)")
        VenueType venueType,
        @Schema(description = "생애주기 (ACTIVE/CLOSED). HIDDEN 은 응답에 나오지 않는다")
        VenueStatus status,
        @Schema(description = "장소명(한글)")
        String nameKo,
        @Schema(description = "장소명(영문). 없으면 null — 화면에서 nameKo 로 폴백한다")
        String nameEn,
        @Schema(description = "현지 표기(漢字/かな 등). 영문 로케일에서도 숨기지 않는다")
        String nameLocal,
        @Schema(description = "주소")
        String address,
        @Schema(description = "상세 주소(층·호수)")
        String addressDetail,
        @Schema(description = "위도. 좌표 미등록이면 null")
        BigDecimal lat,
        @Schema(description = "경도. 좌표 미등록이면 null")
        BigDecimal lng,
        @Schema(description = "지도 마커로 그릴 수 있는가 — 좌표가 유효하고 ACTIVE 인 경우만 true")
        boolean mappable,
        @Schema(description = "국가 코드 (ISO 3166-1 alpha-2, 소문자)")
        String countryCode,
        @Schema(description = "도시 고유 ID")
        Long cityId,
        @Schema(description = "도시 URL 세그먼트")
        String citySlug,
        @Schema(description = "도시명(한글)")
        String cityNameKo,
        @Schema(description = "도시명(영문)")
        String cityNameEn
) {
    public static VenueSummaryResponse from(Venue venue) {
        return new VenueSummaryResponse(
                venue.getId(),
                venue.getVenueType(),
                venue.getStatus(),
                venue.getNameKo(),
                venue.getNameEn(),
                venue.getNameLocal(),
                venue.getAddress(),
                venue.getAddressDetail(),
                venue.getLat(),
                venue.getLng(),
                venue.isMappable(),
                venue.getCountryCode(),
                venue.getCity().getId(),
                venue.getCity().getSlug(),
                venue.getCity().getNameKo(),
                venue.getCity().getNameEn()
        );
    }
}
