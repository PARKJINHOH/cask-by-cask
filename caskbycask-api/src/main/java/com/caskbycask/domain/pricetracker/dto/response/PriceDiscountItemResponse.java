package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.PriceDiscountItem;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.enums.DiscountType;

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

    public static PriceDiscountItemResponse fromKrw(PriceDiscountItem item, PriceReport report) {
        return new PriceDiscountItemResponse(
                item.getId(),
                item.getDiscountType(),
                report.convertToKrw(item.getDiscountAmount()),
                item.getDescription()
        );
    }
}
