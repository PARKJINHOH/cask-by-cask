package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Component
public class ExchangeRateProviderClient {

    static final String PROVIDER_NAME = "FRANKFURTER";
    private static final String QUOTES = "KRW,USD,JPY,CNY,TWD";
    private static final int MAX_CONFIGURED_ATTEMPTS = 5;

    private final RestClient restClient;
    private final int maxAttempts;
    private final long initialBackoffMs;
    private final Sleeper sleeper;

    @Autowired
    public ExchangeRateProviderClient(
            @Value("${exchange-rate.provider-url:https://api.frankfurter.dev}") String providerUrl,
            @Value("${exchange-rate.connect-timeout-ms:3000}") long connectTimeoutMs,
            @Value("${exchange-rate.read-timeout-ms:15000}") long readTimeoutMs,
            @Value("${exchange-rate.retry-max-attempts:3}") int maxAttempts,
            @Value("${exchange-rate.retry-initial-backoff-ms:1000}") long initialBackoffMs) {
        this(providerUrl, connectTimeoutMs, readTimeoutMs, maxAttempts, initialBackoffMs, Thread::sleep);
    }

    ExchangeRateProviderClient(
            String providerUrl,
            long connectTimeoutMs,
            long readTimeoutMs,
            int maxAttempts,
            long initialBackoffMs,
            Sleeper sleeper) {
        if (maxAttempts < 1 || maxAttempts > MAX_CONFIGURED_ATTEMPTS) {
            throw new IllegalArgumentException(
                    "exchange-rate.retry-max-attempts must be between 1 and " + MAX_CONFIGURED_ATTEMPTS);
        }
        if (initialBackoffMs < 0) {
            throw new IllegalArgumentException("exchange-rate.retry-initial-backoff-ms must not be negative");
        }

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        this.restClient = RestClient.builder()
                .baseUrl(providerUrl)
                .requestFactory(requestFactory)
                .build();
        this.maxAttempts = maxAttempts;
        this.initialBackoffMs = initialBackoffMs;
        this.sleeper = Objects.requireNonNull(sleeper);
    }

    public List<ProviderQuote> fetchLatestKrwRates() {
        long backoffMs = initialBackoffMs;
        for (int attempt = 1; ; attempt++) {
            try {
                return fetchLatestKrwRatesOnce();
            } catch (RuntimeException e) {
                if (!isRetryable(e) || attempt >= maxAttempts) {
                    throw e;
                }

                log.warn(
                        "Exchange-rate provider request failed; retrying: attempt={}/{}, backoffMs={}, error={}: {}",
                        attempt, maxAttempts, backoffMs, e.getClass().getSimpleName(), e.getMessage());
                sleepBeforeRetry(backoffMs);
                backoffMs = doubledBackoff(backoffMs);
            }
        }
    }

    private List<ProviderQuote> fetchLatestKrwRatesOnce() {
        FrankfurterRate[] response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v2/rates")
                        .queryParam("base", "EUR")
                        .queryParam("quotes", QUOTES)
                        .build())
                .retrieve()
                .body(FrankfurterRate[].class);

        if (response == null || response.length == 0) {
            throw new IllegalStateException("Exchange-rate provider returned an empty response");
        }

        Map<String, FrankfurterRate> byQuote = new HashMap<>();
        for (FrankfurterRate row : response) {
            if (row.quote() != null && row.rate() != null
                    && row.rate().compareTo(BigDecimal.ZERO) > 0 && row.date() != null) {
                byQuote.put(row.quote(), row);
            }
        }

        FrankfurterRate krw = requireQuote(byQuote, PriceCurrency.KRW.name());
        List<ProviderQuote> result = new ArrayList<>();
        for (PriceCurrency currency : ExchangeRateService.SUPPORTED_FOREIGN_CURRENCIES) {
            if (currency == PriceCurrency.EUR) {
                result.add(new ProviderQuote(currency, krw.rate(), krw.date()));
                continue;
            }
            FrankfurterRate foreign = requireQuote(byQuote, currency.name());
            BigDecimal krwPerUnit = krw.rate().divide(foreign.rate(), 8, RoundingMode.HALF_UP);
            LocalDate effectiveDate = krw.date().isBefore(foreign.date()) ? krw.date() : foreign.date();
            result.add(new ProviderQuote(currency, krwPerUnit, effectiveDate));
        }
        return result;
    }

    static boolean isRetryable(RuntimeException exception) {
        if (exception instanceof ResourceAccessException) {
            return true;
        }
        if (exception instanceof RestClientResponseException responseException) {
            return responseException.getStatusCode().value() == 429
                    || responseException.getStatusCode().is5xxServerError();
        }
        return false;
    }

    private void sleepBeforeRetry(long backoffMs) {
        try {
            sleeper.sleep(backoffMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Exchange-rate retry interrupted", e);
        }
    }

    private long doubledBackoff(long backoffMs) {
        return backoffMs > Long.MAX_VALUE / 2 ? Long.MAX_VALUE : backoffMs * 2;
    }

    private FrankfurterRate requireQuote(Map<String, FrankfurterRate> rates, String quote) {
        FrankfurterRate rate = rates.get(quote);
        if (rate == null) {
            throw new IllegalStateException("Exchange-rate provider omitted " + quote);
        }
        return rate;
    }

    public record ProviderQuote(
            PriceCurrency currency,
            BigDecimal krwPerUnit,
            LocalDate effectiveDate
    ) {}

    private record FrankfurterRate(
            LocalDate date,
            String base,
            String quote,
            BigDecimal rate
    ) {}

    @FunctionalInterface
    interface Sleeper {
        void sleep(long millis) throws InterruptedException;
    }
}
