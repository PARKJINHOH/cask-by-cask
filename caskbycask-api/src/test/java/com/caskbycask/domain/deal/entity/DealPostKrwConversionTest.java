package com.caskbycask.domain.deal.entity;

import com.caskbycask.domain.deal.entity.enums.DealStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DealPostKrwConversionTest {

    @Test
    @DisplayName("외화 딜은 환율 스냅샷으로 원화를 확정한다 — $187.2 가 187원으로 집계되던 문제의 핵심")
    void applyExchangeRate_convertsForeignAmounts() {
        DealPost deal = deal("USD", 234, 187);

        deal.applyExchangeRate(new BigDecimal("1428.75"), LocalDate.of(2026, 8, 4));

        assertThat(deal.getDealPriceKrw()).isEqualByComparingTo("267176");   // 187 x 1428.75
        assertThat(deal.getOriginalPriceKrw()).isEqualByComparingTo("334328"); // 234 x 1428.75
        assertThat(deal.getExchangeRateDate()).isEqualTo(LocalDate.of(2026, 8, 4));
        assertThat(deal.resolveDealPriceKrw()).isEqualByComparingTo("267176");
    }

    @Test
    @DisplayName("KRW 딜은 환율 없이 금액을 그대로 쓴다")
    void applyExchangeRate_krwCopiesAmounts() {
        DealPost deal = deal("KRW", 120_000, 90_000);

        deal.applyExchangeRate(null, null);

        assertThat(deal.getDealPriceKrw()).isEqualByComparingTo("90000");
        assertThat(deal.getExchangeRateSnapshot()).isNull();
        assertThat(deal.isKrw()).isTrue();
    }

    @Test
    @DisplayName("통화가 비어 있으면 KRW 로 본다 — 크롤러 초기 데이터 호환")
    void blankCurrencyIsTreatedAsKrw() {
        assertThat(deal(null, 100, 90).isKrw()).isTrue();
        assertThat(deal("  ", 100, 90).isKrw()).isTrue();
        assertThat(deal("usd", 100, 90).isKrw()).isFalse();
    }

    @Test
    @DisplayName("환율을 못 구한 외화 딜은 원화값이 없다 — 차트가 이 행을 걸러낸다")
    void unconvertedForeignDealHasNoKrwValue() {
        DealPost deal = deal("TWD", 1200, 1000);

        assertThat(deal.resolveDealPriceKrw()).isNull();
        assertThat(deal.resolveOriginalPriceKrw()).isNull();

        deal.applyExchangeRate(null, null);
        assertThat(deal.resolveDealPriceKrw()).isNull();
    }

    @Test
    @DisplayName("할인가가 없으면 정가를 실구매가로 쓴다")
    void fallsBackToOriginalPriceWhenDealPriceMissing() {
        DealPost deal = deal("KRW", 120_000, 0);
        deal.applyExchangeRate(null, null);

        assertThat(deal.resolveDealPriceKrw()).isEqualByComparingTo("120000");
    }

    private DealPost deal(String currency, Integer originalPrice, Integer dealPrice) {
        return DealPost.builder()
                .sourceUrl("https://example.com/deal/" + originalPrice + "-" + dealPrice)
                .sourceSite("TEST")
                .currency(currency)
                .originalPrice(originalPrice)
                .dealPrice(dealPrice)
                .status(DealStatus.APPROVED)
                .isVisible(true)
                .build();
    }
}
