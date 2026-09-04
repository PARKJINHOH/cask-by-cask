package com.caskbycask.domain.venue.client;

import com.caskbycask.domain.venue.support.MapShareUrlParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 주소 → 좌표 (OpenStreetMap Nominatim).
 *
 * <h3>사용 정책을 코드로 강제한다</h3>
 * Nominatim 은 무료지만 정책이 명확하다 — <b>초당 1회</b>, 앱을 식별하는 User-Agent 필수,
 * 벌크 금지. 정책을 어기면 서버 IP 가 차단되어 기능이 통째로 죽는다. 그래서
 * <ul>
 *   <li>전역 1 rps 스로틀을 여기서 건다(관리자가 여러 명이어도 합쳐서 1 rps)</li>
 *   <li>같은 질의는 캐시해서 두 번 나가지 않게 한다</li>
 *   <li><b>사용자 제보 시점에는 절대 부르지 않는다</b> — 관리자가 버튼을 눌렀을 때만.
 *       제보 폼에 붙이면 그 순간 벌크 사용이 된다</li>
 * </ul>
 *
 * <p>기본값은 꺼짐이다. 첫 결과가 엉뚱한 경우가 잦아(특히 상호명 질의) 관리자가
 * 반드시 눈으로 확인해야 하고, 그래서 응답에 {@code GEOCODED} 출처를 함께 실어 보낸다.
 */
@Slf4j
@Component
public class NominatimGeocoder {

    /** 정책상 최소 간격. */
    private static final long MIN_INTERVAL_MS = 1_100;
    private static final int MAX_CACHE_ENTRIES = 500;

    private final boolean enabled;
    private final String baseUrl;
    private final String userAgent;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    private final Map<String, MapShareUrlParser.Coordinates> cache = new ConcurrentHashMap<>();
    private final Object throttleLock = new Object();
    private volatile long lastCallAt = 0L;

    public NominatimGeocoder(
            @Value("${venue.geocoder.enabled:false}") boolean enabled,
            @Value("${venue.geocoder.base-url:https://nominatim.openstreetmap.org}") String baseUrl,
            @Value("${venue.geocoder.user-agent:CaskByCask/1.0 (+https://www.caskbycask.net)}") String userAgent,
            ObjectMapper objectMapper) {
        this.enabled = enabled;
        this.baseUrl = baseUrl;
        this.userAgent = userAgent;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** 실패는 전부 {@link Optional#empty()} — 지오코딩이 죽어도 장소 등록은 계속돼야 한다. */
    public Optional<MapShareUrlParser.Coordinates> geocode(String query) {
        if (!enabled || query == null || query.isBlank()) return Optional.empty();
        String key = query.trim();

        MapShareUrlParser.Coordinates cached = cache.get(key);
        if (cached != null) return Optional.of(cached);

        try {
            throttle();
            String url = baseUrl + "/search?format=jsonv2&limit=1&q="
                    + URLEncoder.encode(key, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(5))
                    .header("User-Agent", userAgent)
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("[NominatimGeocoder] 지오코딩 실패 status={}", response.statusCode());
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(response.body());
            if (!root.isArray() || root.isEmpty()) return Optional.empty();

            JsonNode first = root.get(0);
            var coordinates = new MapShareUrlParser.Coordinates(
                    new BigDecimal(first.path("lat").asText()),
                    new BigDecimal(first.path("lon").asText()));

            if (cache.size() < MAX_CACHE_ENTRIES) cache.put(key, coordinates);
            return Optional.of(coordinates);
        } catch (Exception exception) {
            log.debug("[NominatimGeocoder] 지오코딩 예외: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    /** 전역 1 rps. 관리자 여러 명이 동시에 눌러도 합쳐서 정책을 지킨다. */
    private void throttle() throws InterruptedException {
        synchronized (throttleLock) {
            long wait = lastCallAt + MIN_INTERVAL_MS - System.currentTimeMillis();
            if (wait > 0) Thread.sleep(wait);
            lastCallAt = System.currentTimeMillis();
        }
    }
}
