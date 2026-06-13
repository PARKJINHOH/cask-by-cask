package com.caskbycask.domain.deal.dto;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** 관리자 목록 행 응답. */
public record DealPostSummaryResponse(
        Long id,
        String sourceSite,
        String drinkName,
        String drinkCategory,
        Integer dealPrice,
        BigDecimal discountRate,
        Integer confidenceScore,
        DealStatus status,
        LocalDateTime crawledAt,
        String sourceUrl
) {
    public static DealPostSummaryResponse from(DealPost d) {
        return new DealPostSummaryResponse(
                d.getId(),
                d.getSourceSite(),
                d.getDrinkName(),
                d.getDrinkCategory(),
                d.getDealPrice(),
                d.getDiscountRate(),
                d.getConfidenceScore(),
                d.getStatus(),
                d.getCrawledAt(),
                d.getSourceUrl()
        );
    }
}
