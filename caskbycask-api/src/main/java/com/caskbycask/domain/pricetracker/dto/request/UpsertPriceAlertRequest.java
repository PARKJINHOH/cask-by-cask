package com.caskbycask.domain.pricetracker.dto.request;

import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

/**
 * @param storeType 알림 대상 구간(국내/해외/면세). 사용자가 보고 있던 차트 탭이 그대로 들어온다.
 *                  생략하면 기존 동작대로 국내로 본다.
 * @param targetPrice 목표가(원). 해외·면세도 등록 시점 환율로 환산한 원화와 비교한다.
 */
public record UpsertPriceAlertRequest(
        @NotNull Long spiritId,
        @NotNull @Min(1) @Max(100000) Integer volumeMl,
        StoreType storeType,
        @NotNull @Positive BigDecimal targetPrice
) {}
