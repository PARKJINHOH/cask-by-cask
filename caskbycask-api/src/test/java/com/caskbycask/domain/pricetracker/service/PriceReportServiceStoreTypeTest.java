package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.request.CreatePriceReportRequest;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.Store;
import com.caskbycask.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
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
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.BadWordFilter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PriceReportServiceStoreTypeTest {

    @Mock PriceReportRepository priceReportRepository;
    @Mock PriceReportImageRepository priceReportImageRepository;
    @Mock PriceReportReportRepository priceReportReportRepository;
    @Mock PriceDiscountItemRepository priceDiscountItemRepository;
    @Mock StoreRepository storeRepository;
    @Mock SpiritRepository spiritRepository;
    @Mock UserRepository userRepository;
    @Mock BadWordFilter badWordFilter;
    @Mock ScoreService scoreService;
    @InjectMocks PriceReportService service;

    @Test
    void directInputPersistsRequestedStoreTypeSnapshot() {
        stubCreateDependencies();

        service.createPriceReport(2L, request(null, StoreType.OVERSEAS, PriceCurrency.KRW, null));

        ArgumentCaptor<PriceReport> captor = ArgumentCaptor.forClass(PriceReport.class);
        verify(priceReportRepository).save(captor.capture());
        assertThat(captor.getValue().getStore()).isNull();
        assertThat(captor.getValue().getStoreTypeSnapshot()).isEqualTo(StoreType.OVERSEAS);
        assertThat(captor.getValue().getSuggestedStoreName()).isEqualTo("직접 입력 매장");
    }

    @Test
    void legacyStoreIdUsesMasterStoreTypeInsteadOfClientSnapshot() {
        stubCreateDependencies();
        Store domestic = Store.builder().id(9L).displayName("기존 매장")
                .storeType(StoreType.DOMESTIC).isApproved(true).build();
        given(storeRepository.findById(9L)).willReturn(Optional.of(domestic));

        service.createPriceReport(2L, request(9L, StoreType.OVERSEAS, PriceCurrency.KRW, null));

        ArgumentCaptor<PriceReport> captor = ArgumentCaptor.forClass(PriceReport.class);
        verify(priceReportRepository).save(captor.capture());
        assertThat(captor.getValue().getStore()).isSameAs(domestic);
        assertThat(captor.getValue().getStoreTypeSnapshot()).isEqualTo(StoreType.DOMESTIC);
    }

    @Test
    void dutyFreeRequiresUsdAndExchangeRate() {
        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit()));

        assertThatThrownBy(() -> service.createPriceReport(
                2L, request(null, StoreType.DUTYFREE, PriceCurrency.KRW, null)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_INPUT);

        assertThatThrownBy(() -> service.createPriceReport(
                2L, request(null, StoreType.DUTYFREE, PriceCurrency.USD, null)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.EXCHANGE_RATE_REQUIRED);
    }

    @Test
    void domesticAndOverseasRejectUsd() {
        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit()));

        assertThatThrownBy(() -> service.createPriceReport(
                2L, request(null, StoreType.DOMESTIC, PriceCurrency.USD, BigDecimal.valueOf(1400))))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_INPUT);
        assertThatThrownBy(() -> service.createPriceReport(
                2L, request(null, StoreType.OVERSEAS, PriceCurrency.USD, BigDecimal.valueOf(1400))))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_INPUT);
    }

    private void stubCreateDependencies() {
        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit()));
        given(userRepository.getByIdOrThrow(2L)).willReturn(
                User.builder().id(2L).nickname("제보자").build());
        given(priceReportRepository.save(any(PriceReport.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
    }

    private Spirit spirit() {
        return Spirit.builder().id(1L).nameKo("테스트 주류").build();
    }

    private CreatePriceReportRequest request(Long storeId, StoreType storeType,
                                             PriceCurrency currency, BigDecimal exchangeRate) {
        return new CreatePriceReportRequest(
                1L, 700, storeId, storeType, "직접 입력 매장",
                storeType == StoreType.DUTYFREE ? DutyFreeChannel.AIRPORT : null,
                currency, true, BigDecimal.valueOf(100_000), BigDecimal.valueOf(90_000),
                null, BigDecimal.valueOf(90_000), exchangeRate, null, null,
                List.of(), List.of(), List.of());
    }
}
