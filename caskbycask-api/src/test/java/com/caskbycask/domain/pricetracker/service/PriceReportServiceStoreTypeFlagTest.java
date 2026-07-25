package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.request.CreatePriceReportRequest;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.repository.PriceDiscountItemRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportImageRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportReportRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.pricetracker.repository.StoreRepository;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.util.BadWordFilter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class PriceReportServiceStoreTypeFlagTest {

    @Mock PriceReportRepository priceReportRepository;
    @Mock PriceReportImageRepository priceReportImageRepository;
    @Mock PriceReportReportRepository priceReportReportRepository;
    @Mock PriceDiscountItemRepository priceDiscountItemRepository;
    @Mock StoreRepository storeRepository;
    @Mock SpiritRepository spiritRepository;
    @Mock UserRepository userRepository;
    @Mock BadWordFilter badWordFilter;
    @Mock ScoreService scoreService;
    @Mock ExchangeRateService exchangeRateService;
    @InjectMocks PriceReportService service;

    @Test
    void directInputUsesStoreTypeMedianForAutoFlag() {
        Spirit spirit = Spirit.builder().id(5L).nameKo("테스트 위스키").build();
        User reporter = User.builder().id(9L).nickname("제보자").build();
        given(spiritRepository.findById(5L)).willReturn(Optional.of(spirit));
        given(userRepository.getByIdOrThrow(9L)).willReturn(reporter);
        given(priceReportRepository.findRecentApprovedActualPricesByStoreType(
                any(), any(), any(), any(), any(), any(Pageable.class)))
                .willReturn(List.of(BigDecimal.valueOf(100_000), BigDecimal.valueOf(100_000)));
        given(priceReportRepository.save(any(PriceReport.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        service.createPriceReport(9L, new CreatePriceReportRequest(
                5L, 700, null, StoreType.DOMESTIC, "직접 입력 판매처", null,
                PriceCurrency.KRW, null, true, null, BigDecimal.valueOf(140_000), null,
                BigDecimal.valueOf(140_000), null, null, null, null,
                List.of(), List.of(), List.of()));

        ArgumentCaptor<PriceReport> reportCaptor = ArgumentCaptor.forClass(PriceReport.class);
        org.mockito.Mockito.verify(priceReportRepository).save(reportCaptor.capture());
        assertThat(reportCaptor.getValue().getAutoFlagged()).isTrue();
        org.mockito.Mockito.verify(priceReportRepository).findRecentApprovedActualPricesByStoreType(
                eq(5L), eq(StoreType.DOMESTIC), eq(700), eq(PriceReportStatus.APPROVED),
                eq(PriceCurrency.KRW), any(Pageable.class));
    }
}
