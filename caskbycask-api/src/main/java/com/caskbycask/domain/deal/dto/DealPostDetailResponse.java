package com.caskbycask.domain.deal.dto;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** 관리자 상세 응답 (전체 필드 + 원문 URL). */
public record DealPostDetailResponse(
        Long id,
        String sourceUrl,
        String sourceSite,
        String drinkName,
        String drinkCategory,
        Integer originalPrice,
        Integer dealPrice,
        BigDecimal discountRate,
        String currency,
        String seller,
        String dealCondition,
        String expiryInfo,
        Integer confidenceScore,
        String summaryKo,
        Boolean isVisible,
        DealStatus status,
        LocalDateTime crawledAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static DealPostDetailResponse from(DealPost d) {
        return new DealPostDetailResponse(
                d.getId(),
                d.getSourceUrl(),
                d.getSourceSite(),
                d.getDrinkName(),
                d.getDrinkCategory(),
                d.getOriginalPrice(),
                d.getDealPrice(),
                d.getDiscountRate(),
                d.getCurrency(),
                d.getSeller(),
                d.getDealCondition(),
                d.getExpiryInfo(),
                d.getConfidenceScore(),
                d.getSummaryKo(),
                d.getIsVisible(),
                d.getStatus(),
                d.getCrawledAt(),
                d.getCreatedAt(),
                d.getUpdatedAt()
        );
    }
}
