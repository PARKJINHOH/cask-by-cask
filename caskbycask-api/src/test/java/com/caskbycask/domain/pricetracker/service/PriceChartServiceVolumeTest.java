package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.deal.repository.DealPostRepository;
import com.caskbycask.domain.pricetracker.dto.response.ChartResponse;
import com.caskbycask.domain.pricetracker.dto.response.PriceVolumeOptionResponse;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.Store;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.repository.PriceReportImageRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
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

@ExtendWith(MockitoExtension.class)
class PriceChartServiceVolumeTest {

    @Mock PriceReportRepository priceReportRepository;
    @Mock PriceReportImageRepository priceReportImageRepository;
    @Mock DealPostRepository dealPostRepository;
    @InjectMocks PriceChartService service;

    @Test
    void chartFiltersReportsAndDealsByExactBottleVolume() {
        Spirit spirit = Spirit.builder().id(1L).nameKo("테스트").build();
        PriceReport report500 = report(spirit, 500, 50_000, LocalDate.of(2026, 1, 1));
        PriceReport report700 = report(spirit, 700, 70_000, LocalDate.of(2026, 1, 2));
        DealPost deal700 = DealPost.builder()
                .sourceUrl("https://example.com/deal")
                .sourceSite("TEST")
                .spirit(spirit)
                .storeType(StoreType.DOMESTIC)
                .status(DealStatus.APPROVED)
                .isVisible(true)
                .volumeMl(700)
                .dealPrice(65_000)
                .crawledAt(LocalDateTime.of(2026, 1, 3, 0, 0))
                .build();

        given(priceReportRepository.findApprovedForChart(List.of(1L), PriceReportStatus.APPROVED))
                .willReturn(List.of(report500, report700));
        given(dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(
                List.of(1L), DealStatus.APPROVED)).willReturn(List.of(deal700));

        ChartResponse response = service.getChart(
                List.of(1L), StoreType.DOMESTIC, "ALL", null, 700, false);

        assertThat(response.points()).hasSize(2);
        assertThat(response.points()).extracting(point -> point.minFinalPrice().intValue())
                .containsExactly(70_000, 65_000);
    }

    @Test
    void volumeOptionsKeepLegacyUnknownDataSeparate() {
        Spirit spirit = Spirit.builder().id(1L).nameKo("테스트").build();
        given(priceReportRepository.findApprovedForChart(List.of(1L), PriceReportStatus.APPROVED))
                .willReturn(List.of(
                        report(spirit, 700, 70_000, LocalDate.of(2026, 1, 1)),
                        report(spirit, null, 60_000, LocalDate.of(2026, 1, 2))));
        given(dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(
                List.of(1L), DealStatus.APPROVED)).willReturn(List.of());

        List<PriceVolumeOptionResponse> options = service.getVolumeOptions(
                List.of(1L), StoreType.DOMESTIC);

        assertThat(options).containsExactly(
                new PriceVolumeOptionResponse(700, 1),
                new PriceVolumeOptionResponse(null, 1));
    }

    @Test
    void directInputSnapshotSeparatesDomesticOverseasAndDutyFree() {
        Spirit spirit = Spirit.builder().id(1L).nameKo("테스트").build();
        PriceReport domestic = report(spirit, 700, 50_000, LocalDate.of(2026, 1, 1), StoreType.DOMESTIC, null);
        PriceReport overseas = report(spirit, 750, 60_000, LocalDate.of(2026, 1, 2), StoreType.OVERSEAS, null);
        PriceReport dutyFree = report(spirit, 1000, 70_000, LocalDate.of(2026, 1, 3), StoreType.DUTYFREE, null);
        given(priceReportRepository.findApprovedForChart(List.of(1L), PriceReportStatus.APPROVED))
                .willReturn(List.of(domestic, overseas, dutyFree));
        given(dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(
                List.of(1L), DealStatus.APPROVED)).willReturn(List.of());

        assertThat(service.getVolumeOptions(List.of(1L), StoreType.DOMESTIC))
                .containsExactly(new PriceVolumeOptionResponse(700, 1));
        assertThat(service.getVolumeOptions(List.of(1L), StoreType.OVERSEAS))
                .containsExactly(new PriceVolumeOptionResponse(750, 1));
        assertThat(service.getVolumeOptions(List.of(1L), StoreType.DUTYFREE))
                .containsExactly(new PriceVolumeOptionResponse(1000, 1));
    }

    @Test
    void snapshotHasPriorityAndLegacyStoreRemainsFallback() {
        Spirit spirit = Spirit.builder().id(1L).nameKo("테스트").build();
        Store domesticStore = Store.builder().displayName("국내 매장").storeType(StoreType.DOMESTIC).build();
        Store dutyFreeStore = Store.builder().displayName("면세점").storeType(StoreType.DUTYFREE).build();
        PriceReport snapshotFirst = report(spirit, 700, 50_000, LocalDate.of(2026, 1, 1),
                StoreType.OVERSEAS, domesticStore);
        PriceReport legacyFallback = report(spirit, 1000, 70_000, LocalDate.of(2026, 1, 2),
                null, dutyFreeStore);
        given(priceReportRepository.findApprovedForChart(List.of(1L), PriceReportStatus.APPROVED))
                .willReturn(List.of(snapshotFirst, legacyFallback));
        given(dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(
                List.of(1L), DealStatus.APPROVED)).willReturn(List.of());

        assertThat(service.getVolumeOptions(List.of(1L), StoreType.OVERSEAS))
                .containsExactly(new PriceVolumeOptionResponse(700, 1));
        assertThat(service.getVolumeOptions(List.of(1L), StoreType.DUTYFREE))
                .containsExactly(new PriceVolumeOptionResponse(1000, 1));
    }

    @Test
    void foreignPriceChartUsesStoredKrwSnapshot() {
        Spirit spirit = Spirit.builder().id(1L).nameKo("테스트").build();
        PriceReport taiwanPrice = PriceReport.builder()
                .spirit(spirit)
                .storeTypeSnapshot(StoreType.OVERSEAS)
                .status(PriceReportStatus.APPROVED)
                .currency(PriceCurrency.TWD)
                .volumeMl(700)
                .price(BigDecimal.valueOf(2_500))
                .salePrice(BigDecimal.valueOf(2_000))
                .actualPrice(BigDecimal.valueOf(2_000))
                .actualPriceKrw(BigDecimal.valueOf(90_000))
                .exchangeRateSnapshot(BigDecimal.valueOf(45))
                .purchasedAt(LocalDate.of(2026, 1, 3))
                .isAnonymous(true)
                .autoFlagged(false)
                .reportCount(0)
                .build();
        given(priceReportRepository.findApprovedForChart(List.of(1L), PriceReportStatus.APPROVED))
                .willReturn(List.of(taiwanPrice));
        given(dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(
                List.of(1L), DealStatus.APPROVED)).willReturn(List.of());

        ChartResponse response = service.getChart(
                List.of(1L), StoreType.OVERSEAS, "ALL", null, 700, false);

        assertThat(response.currency()).isEqualTo(PriceCurrency.KRW);
        assertThat(response.points()).singleElement().satisfies(point -> {
            assertThat(point.minFinalPrice()).isEqualByComparingTo("90000");
            assertThat(point.maxPrice()).isEqualByComparingTo("112500");
            assertThat(point.avgSalePrice()).isEqualByComparingTo("90000");
        });
    }

    private PriceReport report(Spirit spirit, Integer volumeMl, int price, LocalDate date) {
        return report(spirit, volumeMl, price, date, null, null);
    }

    private PriceReport report(Spirit spirit, Integer volumeMl, int price, LocalDate date,
                               StoreType storeTypeSnapshot, Store store) {
        return PriceReport.builder()
                .spirit(spirit)
                .store(store)
                .storeTypeSnapshot(storeTypeSnapshot)
                .status(PriceReportStatus.APPROVED)
                .currency(PriceCurrency.KRW)
                .volumeMl(volumeMl)
                .price(BigDecimal.valueOf(price))
                .salePrice(BigDecimal.valueOf(price))
                .actualPrice(BigDecimal.valueOf(price))
                .purchasedAt(date)
                .isAnonymous(true)
                .autoFlagged(false)
                .reportCount(0)
                .build();
    }
}
