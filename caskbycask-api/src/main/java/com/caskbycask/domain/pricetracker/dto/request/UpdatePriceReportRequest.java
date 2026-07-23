package com.caskbycask.domain.pricetracker.dto.request;

import com.caskbycask.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record UpdatePriceReportRequest(
        @NotNull @Min(1) @Max(100000) Integer volumeMl,
        Long storeId,
        StoreType storeType,
        @Size(max = 255) String suggestedStoreName,
        DutyFreeChannel dutyfreeChannel,
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
