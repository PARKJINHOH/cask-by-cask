package com.caskbycask.domain.deal.dto;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;

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
        LocalDateTime updatedAt,
        Long spiritId,
        String spiritNameKo,
        String spiritNameEn,
        String spiritVariantValue,
        String spiritVariantValueEn,
        String spiritBatchNo,
        String spiritBottledDate,
        StoreType storeType
) {
    public static DealPostDetailResponse from(DealPost d) {
        var spirit = d.getSpirit();
        var commonDetail = spirit != null ? spirit.getCommonDetail() : null;
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
                d.getUpdatedAt(),
                spirit != null ? spirit.getId() : null,
                spirit != null ? spirit.getNameKo() : null,
                spirit != null ? spirit.getNameEn() : null,
                spirit != null ? spirit.getVariantValue() : null,
                spirit != null ? spirit.getVariantValueEn() : null,
                commonDetail != null ? commonDetail.getBatchNo() : null,
                commonDetail != null ? commonDetail.getBottledDate() : null,
                d.getStoreType()
        );
    }
}
