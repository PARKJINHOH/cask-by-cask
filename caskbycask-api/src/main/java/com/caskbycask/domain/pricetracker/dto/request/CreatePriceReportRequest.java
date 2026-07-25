package com.caskbycask.domain.pricetracker.dto.request;

import com.caskbycask.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceInputMode;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreatePriceReportRequest(
        @NotNull Long spiritId,
        @NotNull @Min(1) @Max(100000) Integer volumeMl,
        Long storeId,                           // 자동완성 선택 매장 (nullable)
        StoreType storeType,                    // 직접 입력 판매처 유형 (구버전 요청은 nullable)
        @Size(max = 255) String suggestedStoreName, // 직접 입력 매장명 (nullable)
        DutyFreeChannel dutyfreeChannel,        // 면세 매장 제안 시 채널 (nullable)
        PriceCurrency currency,                    // 원화 직접 입력은 null 허용(서버에서 KRW로 정규화)
        PriceInputMode priceInputMode,             // null은 구버전 요청 호환용
        @NotNull Boolean isAnonymous,
        BigDecimal regularPrice,                // 정가
        BigDecimal salePrice,                   // 행사가
        BigDecimal paybackAmount,               // 페이백
        BigDecimal finalPrice,                  // null이면 서비스에서 자동계산
        BigDecimal finalPriceKrw,               // 자동 환산/원화 직접 입력 모두 서버 저장 필수
        BigDecimal exchangeRate,                // 구버전 USD 요청 호환용
        @Size(max = 500) String description,
        LocalDate purchasedAt,
        @Size(max = 3) List<Long> imageIds,
        List<Boolean> imagePublicFlags,
        @Valid List<CreateDiscountItemRequest> discountItems
) {}
