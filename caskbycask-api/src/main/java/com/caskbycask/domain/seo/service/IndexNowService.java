package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.seo.event.IndexingEvent;
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
import java.util.ArrayList;
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

    /**
     * 통지 대상 엔드포인트.
     * <p>IndexNow 참여 검색엔진끼리 제출 내용을 서로 공유하지만, 실제 반영 속도는 직접 받은 쪽이
     * 확실하다. 그래서 Bing 과 네이버에 각각 보낸다(구글은 IndexNow 를 쓰지 않는다).
     */
    @Value("${seo.index-now.endpoints:https://www.bing.com/indexnow,https://searchadvisor.naver.com/indexnow}")
    private List<String> endpoints;

    /** 하위 호환. 단일 엔드포인트(INDEXNOW_ENDPOINT)로 운영하던 배포를 깨지 않는다. */
    @Value("${seo.index-now.endpoint:}")
    private String legacyEndpoint;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void submitAfterCommit(IndexingEvent event) {
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

            String body = json(payload);
            for (String target : targetEndpoints()) {
                submitTo(target, body, urls.size(), event.kind());
            }
        } catch (Exception e) {
            log.warn("IndexNow notification failed without affecting the content transaction: {}", e.getMessage());
        }
    }

    /** 엔드포인트 하나에 통지한다. 한 곳이 실패해도 나머지 통지를 막지 않는다. */
    private void submitTo(String endpoint, String body, int urlCount, String kind) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() == 200 || response.statusCode() == 202) {
                log.info("IndexNow accepted {} {} URLs at {} (status={})",
                        urlCount, kind, endpoint, response.statusCode());
            } else {
                log.warn("IndexNow rejected {} {} URLs at {} (status={})",
                        urlCount, kind, endpoint, response.statusCode());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("IndexNow notification to {} interrupted", endpoint);
        } catch (Exception e) {
            log.warn("IndexNow notification to {} failed: {}", endpoint, e.getMessage());
        }
    }

    /** 설정된 엔드포인트를 중복 없이 모은다. 레거시 단일 설정도 함께 존중한다. */
    private List<String> targetEndpoints() {
        List<String> targets = new ArrayList<>();
        if (endpoints != null) {
            for (String candidate : endpoints) {
                addEndpoint(targets, candidate);
            }
        }
        addEndpoint(targets, legacyEndpoint);
        return targets;
    }

    private void addEndpoint(List<String> targets, String candidate) {
        if (candidate == null) return;
        String trimmed = candidate.trim();
        if (StringUtils.hasText(trimmed) && !targets.contains(trimmed)) {
            targets.add(trimmed);
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
                && !targetEndpoints().isEmpty()
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
