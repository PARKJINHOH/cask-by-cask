package com.caskbycask.domain.translation.client;

import com.caskbycask.domain.translation.entity.enums.TranslationLanguage;
import com.caskbycask.domain.translation.service.TranslationMetrics;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class GoogleTranslationClientTest {

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
        if (server != null) server.stop(0);
        if (executor != null) executor.shutdownNow();
    }

    @Test
    void sendsAllFieldsInOneRequestWithoutSourceLanguage() {
        AtomicInteger requests = new AtomicInteger();
        AtomicReference<String> body = new AtomicReference<>();
        AtomicReference<String> apiKeyHeader = new AtomicReference<>();
        AtomicReference<String> query = new AtomicReference<>();
        server.createContext("/language/translate/v2", exchange -> {
            requests.incrementAndGet();
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            apiKeyHeader.set(exchange.getRequestHeaders().getFirst("X-Goog-Api-Key"));
            query.set(exchange.getRequestURI().getRawQuery());
            respond(exchange, 200, """
                    {"data":{"translations":[
                      {"translatedText":"Floral","detectedSourceLanguage":"ko"},
                      {"translatedText":"Great","detectedSourceLanguage":"ko"}
                    ]}}
                    """);
        });
        server.start();

        List<String> translated = client().translate(List.of("꽃 향", "좋아요"), TranslationLanguage.EN);

        assertThat(requests).hasValue(1);
        assertThat(translated).containsExactly("Floral", "Great");
        assertThat(body.get()).contains("\"q\":[\"꽃 향\",\"좋아요\"]")
                .contains("\"target\":\"en\"")
                .contains("\"model\":\"nmt\"")
                .doesNotContain("\"source\"");
        assertThat(apiKeyHeader).hasValue("server-only-test-key");
        assertThat(query).hasValue(null);
    }

    @Test
    void dailyQuotaResponseMapsToDedicatedErrorWithoutRetry() {
        AtomicInteger requests = new AtomicInteger();
        server.createContext("/language/translate/v2", exchange -> {
            requests.incrementAndGet();
            respond(exchange, 403, "{\"error\":{\"message\":\"Daily Limit Exceeded\"}}");
        });
        server.start();

        assertThatThrownBy(() -> client().translate(List.of("text"), TranslationLanguage.KO))
                .isInstanceOf(CustomException.class)
                .extracting(error -> ((CustomException) error).getErrorCode())
                .isEqualTo(ErrorCode.TRANSLATION_DAILY_LIMIT_EXCEEDED);
        assertThat(requests).hasValue(1);
    }

    @Test
    void providerServerErrorMapsToUnavailableWithoutRetry() {
        AtomicInteger requests = new AtomicInteger();
        server.createContext("/language/translate/v2", exchange -> {
            requests.incrementAndGet();
            respond(exchange, 500, "{\"error\":{\"message\":\"temporary\"}}");
        });
        server.start();

        assertThatThrownBy(() -> client().translate(List.of("text"), TranslationLanguage.KO))
                .isInstanceOf(CustomException.class)
                .extracting(error -> ((CustomException) error).getErrorCode())
                .isEqualTo(ErrorCode.TRANSLATION_UNAVAILABLE);
        assertThat(requests).hasValue(1);
    }

    @Test
    void providerReadTimeoutMapsToUnavailableWithoutRetry() {
        AtomicInteger requests = new AtomicInteger();
        server.createContext("/language/translate/v2", exchange -> {
            requests.incrementAndGet();
            try {
                Thread.sleep(300);
                respond(exchange, 200, "{\"data\":{\"translations\":[{\"translatedText\":\"번역\"}]}}");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                exchange.close();
            }
        });
        server.start();

        assertThatThrownBy(() -> client(50).translate(List.of("text"), TranslationLanguage.KO))
                .isInstanceOf(CustomException.class)
                .extracting(error -> ((CustomException) error).getErrorCode())
                .isEqualTo(ErrorCode.TRANSLATION_UNAVAILABLE);
        assertThat(requests).hasValue(1);
    }

    private GoogleTranslationClient client() {
        return client(1_000);
    }

    private GoogleTranslationClient client(long readTimeoutMs) {
        return new GoogleTranslationClient(
                "http://127.0.0.1:" + server.getAddress().getPort(),
                "server-only-test-key", 1_000, readTimeoutMs, mock(TranslationMetrics.class));
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
