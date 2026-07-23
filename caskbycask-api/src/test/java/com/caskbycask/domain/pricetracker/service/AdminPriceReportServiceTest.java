package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.request.ApprovePriceReportRequest;
import com.caskbycask.domain.pricetracker.dto.response.AdminPriceReportResponse;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.Store;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.repository.PriceDiscountItemRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportImageRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportReportRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class AdminPriceReportServiceTest {

    @Mock PriceReportRepository priceReportRepository;
    @Mock PriceReportImageRepository priceReportImageRepository;
    @Mock PriceDiscountItemRepository priceDiscountItemRepository;
    @Mock PriceReportReportRepository priceReportReportRepository;
    @Mock UserRepository userRepository;
    @Mock ScoreService scoreService;
    @Mock PriceAlertService priceAlertService;
    @InjectMocks AdminPriceReportService service;

    @Test
    @DisplayName("제안 매장명만 있는 가격 등록은 표준 매장 매핑 없이 승인할 수 있다")
    void approvePriceReport_withoutResolvedStore_success() {
        PriceReport report = pendingReport(null);
        User admin = User.builder().id(9L).nickname("관리자").build();
        given(priceReportRepository.findById(1L)).willReturn(Optional.of(report));
        given(userRepository.getByIdOrThrow(9L)).willReturn(admin);
        given(priceReportImageRepository.findByPriceReportIdOrderBySortOrder(1L)).willReturn(List.of());
        given(priceReportRepository.save(report)).willReturn(report);

        AdminPriceReportResponse response = service.approvePriceReport(
                1L, 9L, new ApprovePriceReportRequest(null, 700));

        assertThat(response.status()).isEqualTo(PriceReportStatus.APPROVED);
        assertThat(response.storeId()).isNull();
        assertThat(response.suggestedStoreName()).isEqualTo("사용자 제안 매장");
        then(priceAlertService).should().checkAndNotifyAlerts(5L, 700, BigDecimal.valueOf(100_000), 1L);
    }

    @Test
    @DisplayName("가격 승인은 연결된 미승인 매장의 상태를 변경하지 않는다")
    void approvePriceReport_withPendingStore_doesNotApproveStore() {
        Store store = Store.builder()
                .id(3L)
                .displayName("신규 매장")
                .storeType(StoreType.DOMESTIC)
                .isApproved(false)
                .build();
        PriceReport report = pendingReport(store);
        User admin = User.builder().id(9L).nickname("관리자").build();
        given(priceReportRepository.findById(1L)).willReturn(Optional.of(report));
        given(userRepository.getByIdOrThrow(9L)).willReturn(admin);
        given(priceReportImageRepository.findByPriceReportIdOrderBySortOrder(1L)).willReturn(List.of());
        given(priceReportRepository.save(report)).willReturn(report);

        AdminPriceReportResponse response = service.approvePriceReport(
                1L, 9L, new ApprovePriceReportRequest(null, 700));

        assertThat(store.getIsApproved()).isFalse();
        assertThat(store.getApprovedBy()).isNull();
        assertThat(response.status()).isEqualTo(PriceReportStatus.APPROVED);
        assertThat(response.needsStoreResolution()).isFalse();
    }

    @Test
    @DisplayName("해외 직접 입력 가격은 국내 목표가 알림에 사용하지 않는다")
    void approvePriceReport_overseasSnapshot_skipsDomesticAlert() {
        PriceReport report = pendingReport(null, StoreType.OVERSEAS);
        User admin = User.builder().id(9L).nickname("관리자").build();
        given(priceReportRepository.findById(1L)).willReturn(Optional.of(report));
        given(userRepository.getByIdOrThrow(9L)).willReturn(admin);
        given(priceReportImageRepository.findByPriceReportIdOrderBySortOrder(1L)).willReturn(List.of());
        given(priceReportRepository.save(report)).willReturn(report);

        service.approvePriceReport(1L, 9L, new ApprovePriceReportRequest(null, 700));

        then(priceAlertService).should(never()).checkAndNotifyAlerts(
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong());
    }

    private PriceReport pendingReport(Store store) {
        return pendingReport(store, null);
    }

    private PriceReport pendingReport(Store store, StoreType storeTypeSnapshot) {
        Spirit spirit = Spirit.builder().id(5L).nameKo("테스트 위스키").nameEn("Test Whisky").build();
        PriceReport report = PriceReport.builder()
                .spirit(spirit)
                .store(store)
                .storeTypeSnapshot(storeTypeSnapshot)
                .status(PriceReportStatus.PENDING)
                .currency(PriceCurrency.KRW)
                .salePrice(BigDecimal.valueOf(100_000))
                .actualPrice(BigDecimal.valueOf(100_000))
                .volumeMl(700)
                .suggestedStoreName(store == null ? "사용자 제안 매장" : null)
                .isAnonymous(true)
                .autoFlagged(false)
                .reportCount(0)
                .build();
        ReflectionTestUtils.setField(report, "id", 1L);
        return report;
    }
}
