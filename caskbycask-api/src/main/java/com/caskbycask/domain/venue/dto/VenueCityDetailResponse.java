package com.caskbycask.domain.venue.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * 도시 하나와 그 안의 장소 전부.
 *
 * <p>지도는 도시 중심 좌표·줌(city)과 마커 목록(venues)이 <b>동시에</b> 있어야 첫 프레임을 그린다.
 * 둘을 따로 부르면 지도가 세계 뷰에서 한 번 그려진 뒤 도시로 튀는 것이 보인다.
 */
public record VenueCityDetailResponse(
        @Schema(description = "도시 정보 — 지도 초기 중심·줌 포함")
        VenueCityResponse city,
        @Schema(description = "이 도시의 공개 장소 전부 (폐업은 목록 뒤로 정렬)")
        List<VenueSummaryResponse> venues
) {
}
