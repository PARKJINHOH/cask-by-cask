package com.drinkindex.domain.pricetracker.dto.request;

import com.drinkindex.domain.pricetracker.entity.enums.PriceCurrency;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreatePriceReportRequest(
        @NotNull Long spiritId,
        Long storeId,                           // 자동완성 선택 매장 (nullable)
        @Size(max = 255) String suggestedStoreName, // 직접 입력 매장명 (nullable)
        @NotNull PriceCurrency currency,
        @NotNull Boolean isAnonymous,
        BigDecimal regularPrice,                // 정가
        BigDecimal salePrice,                   // 행사가
        BigDecimal paybackAmount,               // 페이백
        BigDecimal finalPrice,                  // null이면 서비스에서 자동계산
        BigDecimal exchangeRate,                // 면세 USD 시 필수
        @Size(max = 500) String description,
        LocalDate purchasedAt,
        @Size(max = 3) List<Long> imageIds,
        List<Boolean> imagePublicFlags,
        @Valid List<CreateDiscountItemRequest> discountItems
) {}
