package com.caskbycask.domain.venue.dto;

/** 도시별 공개 장소 수 — 국가 페이지의 카운트 버블용 집계 행. */
public record VenueCityCount(Long cityId, long venueCount) {
}
