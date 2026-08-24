package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.deal.repository.DealPostRepository;
import com.caskbycask.domain.pricetracker.dto.response.ChartResponse;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.repository.PriceReportImageRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

/**
 * 크롤러가 수집한 외화 딜이 원화 축에 그대로 집계되던 회귀를 고정한다.
 *
 * <p>운영(spirit 236, 면세)에서 $187.2 딜이 187원으로 찍혀 차트가 24만원 → 187원 폭락처럼 보였다.
 */
@ExtendWith(MockitoExtension.class)
class PriceChartServiceDealCurrencyTest {

    @Mock PriceReportRepository priceReportRepository;
    @Mock PriceReportImageRepository priceReportImageRepository;
    @Mock DealPostRepository dealPostRepository;
    @InjectMocks PriceChartService service;

    private static final Spirit SPIRIT = Spirit.builder().id(236L).nameKo("카발란 솔리스트 마데이라").build();

    @Test
    @DisplayName("환산된 외화 딜은 원화 금액으로 집계된다 — 187 이 아니라 26만원대")
    void convertedForeignDealAggregatesInKrw() {
        DealPost usdDeal = deal("USD", 234, 187, StoreType.DUTYFREE, LocalDate.of(2026, 8, 4));
        usdDeal.applyExchangeRate(new BigDecimal("1428.75"), LocalDate.of(2026, 8, 4));

        givenNoReports();
        given(dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(
                List.of(236L), DealStatus.APPROVED)).willReturn(List.of(usdDeal));

        ChartResponse response = service.getChart(List.of(236L), StoreType.DUTYFREE, "ALL", null, null, false);

        assertThat(response.points()).hasSize(1);
        assertThat(response.points().get(0).minFinalPrice()).isEqualByComparingTo("267176");
        assertThat(response.points().get(0).maxPrice()).isEqualByComparingTo("334328");
    }

    @Test
    @DisplayName("환산되지 않은 외화 딜은 차트에서 제외된다 — 원화 축 오염 방지의 마지막 방어선")
    void unconvertedForeignDealIsExcluded() {
        DealPost unconverted = deal("USD", 234, 187, StoreType.DUTYFREE, LocalDate.of(2026, 8, 4));

        givenNoReports();
        given(dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(
                List.of(236L), DealStatus.APPROVED)).willReturn(List.of(unconverted));

        ChartResponse response = service.getChart(List.of(236L), StoreType.DUTYFREE, "ALL", null, null, false);

        assertThat(response.points()).isEmpty();
    }

    @Test
    @DisplayName("국내/해외/면세 건수는 storeType 필터와 무관하게 세 값이 모두 채워진다")
    void storeTypeCountsCoverEveryTab() {
        DealPost domestic = deal("KRW", 120_000, 90_000, StoreType.DOMESTIC, LocalDate.of(2026, 8, 1));
        domestic.applyExchangeRate(null, null);
        DealPost dutyFreeA = deal("KRW", 300_000, 248_491, StoreType.DUTYFREE, LocalDate.of(2026, 7, 28));
        dutyFreeA.applyExchangeRate(null, null);
        DealPost dutyFreeB = deal("USD", 234, 187, StoreType.DUTYFREE, LocalDate.of(2026, 8, 4));
        dutyFreeB.applyExchangeRate(new BigDecimal("1428.75"), LocalDate.of(2026, 8, 4));

        given(priceReportRepository.findApprovedForChart(List.of(236L), PriceReportStatus.APPROVED))
                .willReturn(List.of(overseasReport()));
        given(dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(
                List.of(236L), DealStatus.APPROVED)).willReturn(List.of(domestic, dutyFreeA, dutyFreeB));

        ChartResponse response = service.getChart(List.of(236L), StoreType.DUTYFREE, "ALL", null, null, false);

        assertThat(response.storeTypeCounts())
                .containsEntry(StoreType.DOMESTIC, 1L)
                .containsEntry(StoreType.OVERSEAS, 1L)
                .containsEntry(StoreType.DUTYFREE, 2L);
        // 선택한 탭의 포인트만 그려진다.
        assertThat(response.points()).hasSize(2);
    }

    @Test
    @DisplayName("데이터가 없는 탭도 0 으로 내려간다 — 배지가 비어 보이지 않게")
    void emptyTabsReportZero() {
        givenNoReports();
        given(dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(
                List.of(236L), DealStatus.APPROVED)).willReturn(List.of());

        ChartResponse response = service.getChart(List.of(236L), StoreType.DOMESTIC, "ALL", null, null, false);

        assertThat(response.storeTypeCounts())
                .containsEntry(StoreType.DOMESTIC, 0L)
                .containsEntry(StoreType.OVERSEAS, 0L)
                .containsEntry(StoreType.DUTYFREE, 0L);
    }

    private void givenNoReports() {
        given(priceReportRepository.findApprovedForChart(List.of(236L), PriceReportStatus.APPROVED))
                .willReturn(List.of());
    }

    private PriceReport overseasReport() {
        return PriceReport.builder()
                .spirit(SPIRIT)
                .storeTypeSnapshot(StoreType.OVERSEAS)
                .status(PriceReportStatus.APPROVED)
                .currency(PriceCurrency.KRW)
                .actualPrice(BigDecimal.valueOf(250_000))
                .actualPriceKrw(BigDecimal.valueOf(250_000))
                .purchasedAt(LocalDate.of(2026, 8, 2))
                .isAnonymous(true)
                .autoFlagged(false)
                .reportCount(0)
                .build();
    }

    private DealPost deal(String currency, Integer originalPrice, Integer dealPrice,
                          StoreType storeType, LocalDate crawledOn) {
        return DealPost.builder()
                .sourceUrl("https://example.com/deal/" + currency + "-" + crawledOn)
                .sourceSite("NAVER_CAFE")
                .spirit(SPIRIT)
                .currency(currency)
                .originalPrice(originalPrice)
                .dealPrice(dealPrice)
                .storeType(storeType)
                .status(DealStatus.APPROVED)
                .isVisible(true)
                .volumeMl(1000)
                .crawledAt(crawledOn.atStartOfDay())
                .build();
    }
}
