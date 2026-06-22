package com.caskbycask.domain.deal.dto;

import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** 관리자 인라인 수정 요청 (승인 전 보정). @Size 상한은 DealPost 엔티럼 길이와 일치. */
public record UpdateDealRequest(
        @Size(max = 200) String drinkName,
        @Size(max = 50) String drinkCategory,
        Integer originalPrice,
        Integer dealPrice,
        BigDecimal discountRate,
        @Size(max = 10) String currency,
        @Size(max = 200) String seller,
        @Size(max = 500) String dealCondition,
        @Size(max = 200) String expiryInfo,
        String summaryKo,
        Long spiritId,
        StoreType storeType
) {
}
