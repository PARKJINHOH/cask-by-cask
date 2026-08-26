package com.caskbycask.domain.translation.client;

import com.caskbycask.domain.translation.entity.enums.TranslationLanguage;
import com.caskbycask.domain.translation.service.TranslationMetrics;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class GoogleTranslationClient {

    private final RestClient restClient;
    private final String apiKey;
    private final TranslationMetrics metrics;

    @Autowired
    public GoogleTranslationClient(
            @Value("${translation.google.base-url:https://translation.googleapis.com}") String baseUrl,
            @Value("${translation.google.api-key:}") String apiKey,
            @Value("${translation.google.connect-timeout-ms:3000}") long connectTimeoutMs,
            @Value("${translation.google.read-timeout-ms:8000}") long readTimeoutMs,
            TranslationMetrics metrics) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
        this.apiKey = apiKey;
        this.metrics = metrics;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public List<String> translate(List<String> texts, TranslationLanguage targetLanguage) {
        if (!isConfigured()) throw new CustomException(ErrorCode.TRANSLATION_DISABLED);
        try {
            GoogleResponse response = restClient.post()
                    .uri("/language/translate/v2")
                    .header("X-Goog-Api-Key", apiKey)
                    .body(Map.of(
                            "q", texts,
                            "target", targetLanguage.getCode(),
                            "format", "text",
                            "model", "nmt"))
                    .retrieve()
                    .body(GoogleResponse.class);

            if (response == null || response.data() == null
                    || response.data().translations() == null
                    || response.data().translations().size() != texts.size()
                    || response.data().translations().stream().anyMatch(t -> t.translatedText() == null)) {
                metrics.increment("provider_error");
                throw new CustomException(ErrorCode.TRANSLATION_UNAVAILABLE);
            }
            return response.data().translations().stream()
                    .map(GoogleTranslation::translatedText)
                    .toList();
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 403 && isDailyQuotaError(e.getResponseBodyAsString())) {
                metrics.increment("daily_limit");
                throw new CustomException(ErrorCode.TRANSLATION_DAILY_LIMIT_EXCEEDED);
            }
            metrics.increment("provider_error");
            throw new CustomException(ErrorCode.TRANSLATION_UNAVAILABLE);
        } catch (ResourceAccessException e) {
            metrics.increment("provider_error");
            throw new CustomException(ErrorCode.TRANSLATION_UNAVAILABLE);
        } catch (RestClientException e) {
            metrics.increment("provider_error");
            throw new CustomException(ErrorCode.TRANSLATION_UNAVAILABLE);
        }
    }

    private boolean isDailyQuotaError(String body) {
        if (body == null) return false;
        String normalized = body.toLowerCase();
        return normalized.contains("daily limit") || normalized.contains("dailylimitexceeded");
    }

    private record GoogleResponse(GoogleData data) {}
    private record GoogleData(List<GoogleTranslation> translations) {}
    private record GoogleTranslation(String translatedText, String detectedSourceLanguage) {}
}
