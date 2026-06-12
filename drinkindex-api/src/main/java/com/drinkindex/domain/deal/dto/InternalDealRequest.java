package com.drinkindex.domain.deal.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * 크롤러(drinkindex-crawler) → 백엔드 수신 페이로드.
 * 필드는 크롤러 uploader/api_uploader.py 의 build_payload() 와 1:1 대응.
 */
public record InternalDealRequest(
        @NotBlank String sourceUrl,
        @NotBlank String sourceSite,
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
        OffsetDateTime crawledAt
) {
}
