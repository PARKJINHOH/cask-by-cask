package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExchangeRateProviderClientTest {

    private static final String VALID_RESPONSE = """
            [
              {"date":"2026-07-24","base":"EUR","quote":"KRW","rate":1681.94},
              {"date":"2026-07-24","base":"EUR","quote":"USD","rate":1.1414},
              {"date":"2026-07-24","base":"EUR","quote":"JPY","rate":186.47},
              {"date":"2026-07-24","base":"EUR","quote":"CNY","rate":7.7264},
              {"date":"2026-07-24","base":"EUR","quote":"TWD","rate":36.893}
            ]
            """;

    private HttpServer server;
    private ExecutorService executor;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        executor = Executors.newCachedThreadPool();
        server.setExecutor(executor);
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
        if (executor != null) {
            executor.shutdownNow();
        }
    }

    @Test
    void retriesTransientFailuresWithExponentialBackoffThenSucceeds() {
        AtomicInteger requestCount = new AtomicInteger();
        server.createContext("/v2/rates", exchange -> {
            if (requestCount.incrementAndGet() < 3) {
                respond(exchange, 503, "{\"message\":\"temporarily unavailable\"}");
                return;
            }
            respond(exchange, 200, VALID_RESPONSE);
        });
        server.start();
        List<Long> backoffs = new ArrayList<>();
        ExchangeRateProviderClient client = client(3, 100, backoffs::add);

        List<ExchangeRateProviderClient.ProviderQuote> quotes = client.fetchLatestKrwRates();

        assertThat(requestCount).hasValue(3);
        assertThat(backoffs).containsExactly(100L, 200L);
        assertThat(quotes)
                .extracting(ExchangeRateProviderClient.ProviderQuote::currency)
                .containsExactly(
                        PriceCurrency.TWD,
                        PriceCurrency.USD,
                        PriceCurrency.JPY,
                        PriceCurrency.CNY,
                        PriceCurrency.EUR);
        assertThat(quotes)
                .extracting(ExchangeRateProviderClient.ProviderQuote::effectiveDate)
                .containsOnly(LocalDate.of(2026, 7, 24));
    }

    @Test
    void stopsAfterConfiguredAttemptsWhenTransientFailureContinues() {
        AtomicInteger requestCount = new AtomicInteger();
        server.createContext("/v2/rates", exchange -> {
            requestCount.incrementAndGet();
            respond(exchange, 503, "{\"message\":\"temporarily unavailable\"}");
        });
        server.start();
        List<Long> backoffs = new ArrayList<>();
        ExchangeRateProviderClient client = client(3, 100, backoffs::add);

        assertThatThrownBy(client::fetchLatestKrwRates)
                .isInstanceOf(HttpServerErrorException.ServiceUnavailable.class);
        assertThat(requestCount).hasValue(3);
        assertThat(backoffs).containsExactly(100L, 200L);
    }

    @Test
    void doesNotRetryNonTransientClientErrors() {
        AtomicInteger requestCount = new AtomicInteger();
        server.createContext("/v2/rates", exchange -> {
            requestCount.incrementAndGet();
            respond(exchange, 400, "{\"message\":\"bad request\"}");
        });
        server.start();
        List<Long> backoffs = new ArrayList<>();
        ExchangeRateProviderClient client = client(3, 100, backoffs::add);

        assertThatThrownBy(client::fetchLatestKrwRates)
                .isInstanceOf(HttpClientErrorException.BadRequest.class);
        assertThat(requestCount).hasValue(1);
        assertThat(backoffs).isEmpty();
    }

    @Test
    void treatsNetworkFailuresAndRateLimitsAsRetryable() {
        assertThat(ExchangeRateProviderClient.isRetryable(
                new ResourceAccessException("read timed out"))).isTrue();
        assertThat(ExchangeRateProviderClient.isRetryable(
                HttpClientErrorException.create(
                        org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                        "Too Many Requests",
                        org.springframework.http.HttpHeaders.EMPTY,
                        new byte[0],
                        StandardCharsets.UTF_8))).isTrue();
    }

    private ExchangeRateProviderClient client(
            int maxAttempts,
            long initialBackoffMs,
            ExchangeRateProviderClient.Sleeper sleeper) {
        return new ExchangeRateProviderClient(
                "http://127.0.0.1:" + server.getAddress().getPort(),
                1_000,
                1_000,
                maxAttempts,
                initialBackoffMs,
                sleeper);
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
