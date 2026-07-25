package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;

@Component
public class ExchangeRateProviderClient {

    static final String PROVIDER_NAME = "FRANKFURTER";
    private static final String QUOTES = "KRW,USD,JPY,CNY,TWD";

    private final RestClient restClient;

    public ExchangeRateProviderClient(
            @Value("${exchange-rate.provider-url:https://api.frankfurter.dev}") String providerUrl,
            @Value("${exchange-rate.connect-timeout-ms:3000}") long connectTimeoutMs,
            @Value("${exchange-rate.read-timeout-ms:5000}") long readTimeoutMs) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        this.restClient = RestClient.builder()
                .baseUrl(providerUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public List<ProviderQuote> fetchLatestKrwRates() {
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
}
