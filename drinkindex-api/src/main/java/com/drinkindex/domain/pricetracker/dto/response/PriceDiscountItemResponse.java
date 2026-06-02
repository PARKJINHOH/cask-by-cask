package com.drinkindex.domain.pricetracker.dto.response;

import com.drinkindex.domain.pricetracker.entity.PriceDiscountItem;
import com.drinkindex.domain.pricetracker.entity.enums.DiscountType;

import java.math.BigDecimal;

public record PriceDiscountItemResponse(
        Long id,
        DiscountType discountType,
        BigDecimal discountAmount,
        String description
) {
    public static PriceDiscountItemResponse from(PriceDiscountItem item) {
        return new PriceDiscountItemResponse(
                item.getId(),
                item.getDiscountType(),
                item.getDiscountAmount(),
                item.getDescription()
        );
    }
}
