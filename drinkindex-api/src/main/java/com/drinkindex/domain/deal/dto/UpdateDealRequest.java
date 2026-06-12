package com.drinkindex.domain.deal.dto;

import java.math.BigDecimal;

/** 관리자 인라인 수정 요청 (승인 전 보정). */
public record UpdateDealRequest(
        String drinkName,
        String drinkCategory,
        Integer originalPrice,
        Integer dealPrice,
        BigDecimal discountRate,
        String seller,
        String dealCondition,
        String expiryInfo,
        String summaryKo
) {
}
