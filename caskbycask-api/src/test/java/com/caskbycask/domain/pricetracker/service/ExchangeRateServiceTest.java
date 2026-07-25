package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.entity.ExchangeRate;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.repository.ExchangeRateRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ExchangeRateServiceTest {

    @Mock ExchangeRateRepository exchangeRateRepository;
    @Mock ExchangeRateProviderClient providerClient;
    @InjectMocks ExchangeRateService service;

    @Test
    void refreshPersistsTheCompleteSupportedCurrencySet() {
        LocalDate effectiveDate = LocalDate.of(2026, 7, 24);
        given(providerClient.fetchLatestKrwRates()).willReturn(List.of(
                quote(PriceCurrency.TWD, "45.59", effectiveDate),
                quote(PriceCurrency.USD, "1473.58", effectiveDate),
                quote(PriceCurrency.JPY, "9.02", effectiveDate),
                quote(PriceCurrency.CNY, "217.69", effectiveDate),
                quote(PriceCurrency.EUR, "1681.94", effectiveDate)
        ));
        given(exchangeRateRepository.findAll()).willReturn(List.of());
        given(exchangeRateRepository.saveAll(anyList()))
                .willAnswer(invocation -> invocation.getArgument(0));

        service.refresh();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ExchangeRate>> captor = ArgumentCaptor.forClass(List.class);
        verify(exchangeRateRepository).saveAll(captor.capture());
        assertThat(captor.getValue())
                .extracting(ExchangeRate::getCurrency)
                .containsExactlyElementsOf(ExchangeRateService.SUPPORTED_FOREIGN_CURRENCIES);
        assertThat(captor.getValue())
                .allSatisfy(rate -> {
                    assertThat(rate.getProvider()).isEqualTo(ExchangeRateProviderClient.PROVIDER_NAME);
                    assertThat(rate.getEffectiveDate()).isEqualTo(effectiveDate);
                    assertThat(rate.getFetchedAt()).isNotNull();
                });
    }

    private ExchangeRateProviderClient.ProviderQuote quote(
            PriceCurrency currency, String rate, LocalDate effectiveDate) {
        return new ExchangeRateProviderClient.ProviderQuote(
                currency, new BigDecimal(rate), effectiveDate);
    }
}
