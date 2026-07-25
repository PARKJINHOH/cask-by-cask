package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.ExchangeRate;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ExchangeRateResponse(
        PriceCurrency currency,
        BigDecimal krwPerUnit,
        String provider,
        LocalDate effectiveDate,
        LocalDateTime fetchedAt
) {
    public static ExchangeRateResponse from(ExchangeRate rate) {
        return new ExchangeRateResponse(
                rate.getCurrency(),
                rate.getKrwPerUnit(),
                rate.getProvider(),
                rate.getEffectiveDate(),
                rate.getFetchedAt()
        );
    }
}
