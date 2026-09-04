package com.caskbycask.domain.venue.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/** 주류 상세의 "이 술을 마실 수 있는 곳" 한 줄. */
public record SpiritVenueResponse(
        @Schema(description = "장소 요약 — 이름·주소·좌표·도시")
        VenueSummaryResponse venue,
        @Schema(description = "이 술(하위 에디션 포함)을 여기서 마신 리뷰 수")
        long reviewCount,
        @Schema(description = "가장 최근에 여기서 마신 리뷰 시각")
        LocalDateTime lastReviewedAt
) {
}
