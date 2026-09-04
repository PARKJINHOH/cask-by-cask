package com.caskbycask.domain.venue.dto;

import com.caskbycask.domain.venue.entity.Venue;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 상세 패널·문서 페이지용 전체형.
 *
 * <p>{@code summary} 를 품는 구조로 둔 것은 목록에서 상세로 넘어갈 때 화면이 이미 갖고 있는 필드를
 * 그대로 재사용해 깜빡임 없이 그리기 위해서다.
 */
public record VenueDetailResponse(
        @Schema(description = "목록과 공통인 축약 정보")
        VenueSummaryResponse summary,
        @Schema(description = "전화번호(원문 표기)")
        String phone,
        @Schema(description = "웹사이트")
        String website,
        @Schema(description = "인스타그램")
        String instagramUrl,
        @Schema(description = "영업시간(자유 텍스트). 구조화되어 있지 않아 그대로 표시한다")
        String openingHours,
        @Schema(description = "구글 지도 URL. 관리자 검증본이 있으면 검색 링크보다 우선한다")
        String googleMapsUrl,
        @Schema(description = "네이버 지도 URL")
        String naverMapsUrl,
        @Schema(description = "카카오 지도 URL")
        String kakaoMapsUrl,
        @Schema(description = "구글 place id")
        String googlePlaceId,
        @Schema(description = "네이버 place id")
        String naverPlaceId,
        @Schema(description = "소개(한글)")
        String descriptionKo,
        @Schema(description = "소개(영문)")
        String descriptionEn
) {
    public static VenueDetailResponse from(Venue venue) {
        return new VenueDetailResponse(
                VenueSummaryResponse.from(venue),
                venue.getPhone(),
                venue.getWebsite(),
                venue.getInstagramUrl(),
                venue.getOpeningHours(),
                venue.getGoogleMapsUrl(),
                venue.getNaverMapsUrl(),
                venue.getKakaoMapsUrl(),
                venue.getGooglePlaceId(),
                venue.getNaverPlaceId(),
                venue.getDescriptionKo(),
                venue.getDescriptionEn()
        );
    }
}
