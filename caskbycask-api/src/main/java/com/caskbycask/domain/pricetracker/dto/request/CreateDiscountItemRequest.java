package com.caskbycask.domain.pricetracker.dto.request;

import com.caskbycask.domain.pricetracker.entity.enums.DiscountType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateDiscountItemRequest(
        @NotNull DiscountType discountType,
        @Size(max = 100) String label,
        @NotNull BigDecimal amount,
        int sortOrder
) {}
