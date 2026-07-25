package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.response.ExchangeRateResponse;
import com.caskbycask.domain.pricetracker.entity.ExchangeRate;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.repository.ExchangeRateRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeRateService {

    public static final List<PriceCurrency> SUPPORTED_FOREIGN_CURRENCIES =
            List.of(PriceCurrency.TWD, PriceCurrency.USD, PriceCurrency.JPY,
                    PriceCurrency.CNY, PriceCurrency.EUR);

    private final ExchangeRateRepository exchangeRateRepository;
    private final ExchangeRateProviderClient providerClient;

    public List<ExchangeRateResponse> getAvailableRates() {
        List<ExchangeRate> rates = findSupportedRates();
        if (rates.size() < SUPPORTED_FOREIGN_CURRENCIES.size()) {
            try {
                refresh();
                rates = findSupportedRates();
            } catch (RuntimeException e) {
                log.warn("Initial exchange-rate refresh failed; returning last available rates", e);
            }
        }
        return rates.stream()
                .sorted(Comparator.comparingInt(rate ->
                        SUPPORTED_FOREIGN_CURRENCIES.indexOf(rate.getCurrency())))
                .map(ExchangeRateResponse::from)
                .toList();
    }

    public ExchangeRate getRequiredRate(PriceCurrency currency) {
        validateSupportedCurrency(currency);
        return exchangeRateRepository.findById(currency)
                .orElseGet(() -> {
                    try {
                        refresh();
                    } catch (RuntimeException e) {
                        log.warn("On-demand exchange-rate refresh failed for {}", currency, e);
                    }
                    return exchangeRateRepository.findById(currency)
                            .orElseThrow(() -> new CustomException(ErrorCode.EXCHANGE_RATE_UNAVAILABLE));
                });
    }

    @Transactional
    public synchronized void refresh() {
        List<ExchangeRateProviderClient.ProviderQuote> quotes = providerClient.fetchLatestKrwRates();
        if (quotes.size() != SUPPORTED_FOREIGN_CURRENCIES.size()) {
            throw new IllegalStateException("Exchange-rate provider returned an incomplete currency set");
        }

        Map<PriceCurrency, ExchangeRate> existing = new EnumMap<>(PriceCurrency.class);
        exchangeRateRepository.findAll().forEach(rate -> existing.put(rate.getCurrency(), rate));
        LocalDateTime fetchedAt = LocalDateTime.now();

        List<ExchangeRate> refreshed = quotes.stream()
                .map(quote -> {
                    ExchangeRate rate = existing.get(quote.currency());
                    if (rate == null) {
                        return ExchangeRate.builder()
                                .currency(quote.currency())
                                .krwPerUnit(quote.krwPerUnit())
                                .provider(ExchangeRateProviderClient.PROVIDER_NAME)
                                .effectiveDate(quote.effectiveDate())
                                .fetchedAt(fetchedAt)
                                .build();
                    }
                    rate.refresh(quote.krwPerUnit(), ExchangeRateProviderClient.PROVIDER_NAME,
                            quote.effectiveDate(), fetchedAt);
                    return rate;
                })
                .toList();

        exchangeRateRepository.saveAll(refreshed);
        log.info("Exchange rates refreshed: provider={}, currencies={}, effectiveDates={}",
                ExchangeRateProviderClient.PROVIDER_NAME,
                refreshed.stream().map(ExchangeRate::getCurrency).toList(),
                refreshed.stream().map(ExchangeRate::getEffectiveDate).distinct().toList());
    }

    private List<ExchangeRate> findSupportedRates() {
        return exchangeRateRepository.findByCurrencyIn(SUPPORTED_FOREIGN_CURRENCIES);
    }

    private void validateSupportedCurrency(PriceCurrency currency) {
        if (currency == null || !SUPPORTED_FOREIGN_CURRENCIES.contains(currency)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }
}
