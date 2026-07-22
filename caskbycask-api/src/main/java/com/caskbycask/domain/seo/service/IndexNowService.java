package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.seo.event.SpiritIndexingEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class IndexNowService {

    private static final String KEY_LOCATION_PATH = "/indexnow-key.txt";
    private static final String KEY_PATTERN = "[a-fA-F0-9-]{8,128}";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    @Value("${seo.site-url:https://www.caskbycask.net}")
    private String siteUrl;

    @Value("${seo.index-now.enabled:false}")
    private boolean enabled;

    @Value("${seo.index-now.key:}")
    private String key;

    @Value("${seo.index-now.endpoint:https://searchadvisor.naver.com/indexnow}")
    private String endpoint;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void submitAfterCommit(SpiritIndexingEvent event) {
        if (!enabled) return;
        if (!validConfiguration()) {
            log.warn("IndexNow is enabled but its configuration is invalid; notification skipped");
            return;
        }

        try {
            URI site = URI.create(normalizedSiteUrl());
            List<String> urls = event.urls().stream()
                    .filter(url -> sameHost(site, url))
                    .distinct()
                    .limit(10_000)
                    .toList();
            if (urls.isEmpty()) return;

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("host", site.getHost());
            payload.put("key", key);
            payload.put("keyLocation", normalizedSiteUrl() + KEY_LOCATION_PATH);
            payload.put("urlList", urls);

            HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(json(payload)))
                    .build();
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() == 200 || response.statusCode() == 202) {
                log.info("IndexNow accepted {} spirit URLs (status={})", urls.size(), response.statusCode());
            } else {
                log.warn("IndexNow rejected {} spirit URLs (status={})", urls.size(), response.statusCode());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("IndexNow notification interrupted");
        } catch (Exception e) {
            log.warn("IndexNow notification failed without affecting the content transaction: {}", e.getMessage());
        }
    }

    public boolean isKeyFileAvailable() {
        return enabled && validConfiguration();
    }

    public String keyFileContent() {
        return key;
    }

    private boolean validConfiguration() {
        return StringUtils.hasText(siteUrl)
                && StringUtils.hasText(endpoint)
                && key != null
                && key.matches(KEY_PATTERN);
    }

    private boolean sameHost(URI site, String url) {
        try {
            URI candidate = URI.create(url);
            return "https".equalsIgnoreCase(candidate.getScheme())
                    && site.getHost().equalsIgnoreCase(candidate.getHost());
        } catch (RuntimeException e) {
            return false;
        }
    }

    private String json(Map<String, Object> payload) throws JsonProcessingException {
        return objectMapper.writeValueAsString(payload);
    }

    private String normalizedSiteUrl() {
        return siteUrl.endsWith("/") ? siteUrl.substring(0, siteUrl.length() - 1) : siteUrl;
    }
}
