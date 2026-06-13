package com.caskbycask.domain.pricetracker.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record UpsertPriceAlertRequest(
        @NotNull Long spiritId,
        @NotNull @Positive BigDecimal targetPrice  // KRW 기준
) {}
