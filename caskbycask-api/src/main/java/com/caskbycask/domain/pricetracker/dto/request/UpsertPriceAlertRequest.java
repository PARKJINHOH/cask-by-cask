package com.caskbycask.domain.pricetracker.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

public record UpsertPriceAlertRequest(
        @NotNull Long spiritId,
        @NotNull @Min(1) @Max(100000) Integer volumeMl,
        @NotNull @Positive BigDecimal targetPrice  // KRW 기준
) {}
