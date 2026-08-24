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

import java.math.BigDecimal;
import java.time.LocalDate;
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

    /**
     * 특정 날짜의 환율을 조회한다. 캐시하지 않고 제공자에 매번 묻는다(백필 전용, 호출 빈도 낮음).
     *
     * <p>제공자가 휴장일이면 직전 영업일 값을 돌려주므로 {@code effectiveDate} 가 요청일과 다를 수 있다.
     */
    public RateQuote getHistoricalRate(PriceCurrency currency, LocalDate date) {
        validateSupportedCurrency(currency);
        return providerClient.fetchHistoricalKrwRates(date).stream()
                .filter(quote -> quote.currency() == currency)
                .findFirst()
                .map(quote -> new RateQuote(quote.krwPerUnit(), quote.effectiveDate()))
                .orElseThrow(() -> new CustomException(ErrorCode.EXCHANGE_RATE_UNAVAILABLE));
    }

    /** 날짜 단위 환율 조회 결과. 엔티티(통화당 1행 캐시)와 달리 과거 값을 담을 수 있다. */
    public record RateQuote(BigDecimal krwPerUnit, LocalDate effectiveDate) {}

    private List<ExchangeRate> findSupportedRates() {
        return exchangeRateRepository.findByCurrencyIn(SUPPORTED_FOREIGN_CURRENCIES);
    }

    private void validateSupportedCurrency(PriceCurrency currency) {
        if (currency == null || !SUPPORTED_FOREIGN_CURRENCIES.contains(currency)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }
}
