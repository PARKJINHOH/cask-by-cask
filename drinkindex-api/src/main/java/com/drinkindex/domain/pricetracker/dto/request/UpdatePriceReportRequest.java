package com.drinkindex.domain.pricetracker.dto.request;

import com.drinkindex.domain.pricetracker.entity.enums.PriceCurrency;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record UpdatePriceReportRequest(
        Long storeId,
        @Size(max = 255) String suggestedStoreName,
        @NotNull PriceCurrency currency,
        @NotNull Boolean isAnonymous,
        BigDecimal regularPrice,
        BigDecimal salePrice,
        BigDecimal paybackAmount,
        BigDecimal finalPrice,
        BigDecimal exchangeRate,
        @Size(max = 500) String description,
        LocalDate purchasedAt,
        @Size(max = 3) List<Long> imageIds,
        List<Boolean> imagePublicFlags,
        @Valid List<CreateDiscountItemRequest> discountItems
) {}
