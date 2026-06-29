package com.caskbycask.domain.deal.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

final class DealPriceNormalizer {

    private static final BigDecimal ZERO_RATE = BigDecimal.ZERO.setScale(4, RoundingMode.UNNECESSARY);

    private DealPriceNormalizer() {
    }

    static Integer normalizePrice(Integer value) {
        if (value == null || value < 0) {
            return 0;
        }
        return value;
    }

    static BigDecimal calculateDiscountRate(Integer originalPrice, Integer dealPrice) {
        int original = normalizePrice(originalPrice);
        int deal = normalizePrice(dealPrice);
        if (original <= 0 || deal <= 0 || original <= deal) {
            return ZERO_RATE;
        }
        return BigDecimal.valueOf(original - deal)
                .divide(BigDecimal.valueOf(original), 4, RoundingMode.HALF_UP);
    }

    static String normalizeCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return "KRW";
        }
        return currency.trim().toUpperCase();
    }
}
