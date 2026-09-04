package com.caskbycask.domain.venue.dto;

import java.time.LocalDateTime;

/** 주류별 장소 집계 행 — 장소 id, 그 술을 마신 리뷰 수, 가장 최근 리뷰 시각. */
public record SpiritVenueCount(Long venueId, long reviewCount, LocalDateTime lastReviewedAt) {
}
