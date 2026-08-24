package com.caskbycask.domain.deal.service;

import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;

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
        return resolveCurrency(currency).name();
    }

    /**
     * 통화 문자열을 {@link PriceCurrency} 로 확정한다. 빈 값은 KRW 로 본다.
     *
     * <p>deal_posts.currency 는 자유 문자열이라 예전에는 임의 값이 그대로 통과했고, 차트가 이를
     * 환산 없이 원화로 집계해 "$187 → 187원" 문제를 만들었다. 환율을 붙일 수 있는 통화만 허용한다.
     */
    static PriceCurrency resolveCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return PriceCurrency.KRW;
        }
        try {
            return PriceCurrency.valueOf(currency.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.DEAL_CURRENCY_NOT_SUPPORTED);
        }
    }
}
