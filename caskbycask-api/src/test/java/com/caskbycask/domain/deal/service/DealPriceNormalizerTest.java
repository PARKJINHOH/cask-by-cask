package com.caskbycask.domain.deal.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class DealPriceNormalizerTest {

    @Test
    void calculateDiscountRateFromOriginalAndDealPrice() {
        BigDecimal rate = DealPriceNormalizer.calculateDiscountRate(100_000, 75_000);

        assertThat(rate).isEqualByComparingTo("0.2500");
    }

    @Test
    void normalizeEmptyOrInvalidPricesToZeroRate() {
        assertThat(DealPriceNormalizer.normalizePrice(null)).isZero();
        assertThat(DealPriceNormalizer.normalizePrice(-1)).isZero();
        assertThat(DealPriceNormalizer.calculateDiscountRate(null, 80_000)).isEqualByComparingTo("0.0000");
        assertThat(DealPriceNormalizer.calculateDiscountRate(100_000, null)).isEqualByComparingTo("0.0000");
    }

    @Test
    void returnZeroRateWhenDealPriceIsNotLowerThanOriginalPrice() {
        assertThat(DealPriceNormalizer.calculateDiscountRate(100_000, 100_000)).isEqualByComparingTo("0.0000");
        assertThat(DealPriceNormalizer.calculateDiscountRate(100_000, 120_000)).isEqualByComparingTo("0.0000");
    }
}
