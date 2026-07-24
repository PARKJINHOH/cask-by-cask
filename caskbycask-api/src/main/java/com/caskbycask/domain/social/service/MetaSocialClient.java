package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class MetaSocialClient {

    private final SocialPublishingProperties properties;
    private final RestClient restClient;

    public MetaSocialClient(SocialPublishingProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder().build();
    }

    public String authorizationUrl(SocialPlatform platform, String state) {
        var provider = provider(platform);
        return provider.getAuthorizationUrl()
                + "?client_id=" + encode(provider.getAppId())
                + "&redirect_uri=" + encode(properties.getOauthRedirectUri())
                + "&response_type=code"
                + "&scope=" + encode(provider.getScopes())
                + "&state=" + encode(state)
                + (platform == SocialPlatform.INSTAGRAM
                ? "&enable_fb_login=0&force_authentication=1" : "");
    }

    public TokenResult exchangeCode(SocialPlatform platform, String code) {
        var provider = provider(platform);
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", provider.getAppId());
        form.add("client_secret", provider.getAppSecret());
        form.add("grant_type", "authorization_code");
        form.add("redirect_uri", properties.getOauthRedirectUri());
        form.add("code", code);
        String path = platform == SocialPlatform.INSTAGRAM
                ? "/oauth/access_token" : "/oauth/access_token";
        Map<String, Object> shortToken = postForm(codeExchangeBase(platform) + path, form, false);
        String accessToken = stringValue(shortToken.get("access_token"));
        String userId = stringValue(shortToken.get("user_id"));
        return exchangeLongLived(platform, accessToken, userId);
    }

    public TokenResult refreshLongLived(SocialPlatform platform, String accessToken) {
        var provider = provider(platform);
        String grantType = platform == SocialPlatform.INSTAGRAM
                ? "ig_refresh_token" : "th_refresh_token";
        String url = tokenApiBase(platform) + "/refresh_access_token"
                + "?grant_type=" + encode(grantType)
                + "&access_token=" + encode(accessToken);
        Map<String, Object> response = getMap(url);
        String token = stringValue(response.get("access_token"));
        long expiresIn = longValue(response.get("expires_in"), 5_184_000L);
        AccountProfile profile = getProfile(platform, token);
        return new TokenResult(token, profile.userId(), profile.username(), expiresIn);
    }

    public AccountProfile getProfile(SocialPlatform platform, String accessToken) {
        var provider = provider(platform);
        String url = provider.getApiBaseUrl() + "/me?fields=id,user_id,username"
                + "&access_token=" + encode(accessToken);
        Map<String, Object> response = getMap(url);
        String id = stringValue(response.get("user_id"));
        if (id == null) id = stringValue(response.get("id"));
        return new AccountProfile(id, stringValue(response.get("username")));
    }

    public String createImageContainer(SocialPlatform platform, String userId,
                                       String accessToken, String imageUrl, String caption) {
        var provider = provider(platform);
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("access_token", accessToken);
        form.add("image_url", imageUrl);
        if (platform == SocialPlatform.INSTAGRAM) {
            form.add("caption", caption);
        } else {
            form.add("media_type", "IMAGE");
            form.add("text", caption);
        }
        String resource = platform == SocialPlatform.INSTAGRAM ? "/media" : "/threads";
        Map<String, Object> response = postForm(
                provider.getApiBaseUrl() + "/" + encodePath(userId) + resource, form, false);
        return requiredId(response);
    }

    public String publishContainer(SocialPlatform platform, String userId,
                                   String accessToken, String containerId) {
        var provider = provider(platform);
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("access_token", accessToken);
        form.add("creation_id", containerId);
        String resource = platform == SocialPlatform.INSTAGRAM ? "/media_publish" : "/threads_publish";
        Map<String, Object> response = postForm(
                provider.getApiBaseUrl() + "/" + encodePath(userId) + resource, form, true);
        return requiredId(response);
    }

    public void waitUntilContainerReady(SocialPlatform platform, String accessToken, String containerId) {
        var provider = provider(platform);
        for (int attempt = 0; attempt < 6; attempt++) {
            Map<String, Object> response = getMap(provider.getApiBaseUrl() + "/" + encodePath(containerId)
                    + "?fields=status_code,status,error_message&access_token=" + encode(accessToken));
            String status = stringValue(response.get("status_code"));
            if (status == null) status = stringValue(response.get("status"));
            if (status == null || "FINISHED".equalsIgnoreCase(status)
                    || "READY".equalsIgnoreCase(status) || "PUBLISHED".equalsIgnoreCase(status)) {
                return;
            }
            if ("ERROR".equalsIgnoreCase(status) || "EXPIRED".equalsIgnoreCase(status)) {
                throw new SocialProviderException("CONTAINER_" + status.toUpperCase(),
                        "Meta media container failed.", false, false, null);
            }
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new SocialProviderException("INTERRUPTED",
                        "Meta media readiness wait was interrupted.", true, false, e);
            }
        }
        throw new SocialProviderException("CONTAINER_TIMEOUT",
                "Meta media container was not ready in time.", true, false, null);
    }

    public String getPermalink(SocialPlatform platform, String accessToken, String mediaId) {
        var provider = provider(platform);
        Map<String, Object> response = getMap(provider.getApiBaseUrl() + "/" + encodePath(mediaId)
                + "?fields=id,permalink&access_token=" + encode(accessToken));
        String permalink = stringValue(response.get("permalink"));
        if (permalink == null || permalink.isBlank()) {
            throw new SocialProviderException(
                    "PERMALINK_MISSING", "Meta API response did not contain a permalink.",
                    true, false, null);
        }
        return permalink;
    }

    public Optional<PublishedMedia> findRecentByCaption(
            SocialPlatform platform, String userId, String accessToken, String caption, LocalDateTime since) {
        var provider = provider(platform);
        String resource = platform == SocialPlatform.INSTAGRAM ? "/media" : "/threads";
        String url = provider.getApiBaseUrl() + "/" + encodePath(userId) + resource
                + "?fields=id,permalink,caption,text,timestamp&limit=25&access_token=" + encode(accessToken);
        Map<String, Object> response = getMap(url);
        Object rawData = response.get("data");
        if (!(rawData instanceof List<?> data)) return Optional.empty();
        for (Object item : data) {
            if (!(item instanceof Map<?, ?> map)) continue;
            String body = stringValue(map.get(platform == SocialPlatform.INSTAGRAM ? "caption" : "text"));
            if (!caption.equals(body)) continue;
            String id = stringValue(map.get("id"));
            String permalink = stringValue(map.get("permalink"));
            if (id != null && permalink != null) return Optional.of(new PublishedMedia(id, permalink));
        }
        return Optional.empty();
    }

    private TokenResult exchangeLongLived(SocialPlatform platform, String shortToken, String userIdFromExchange) {
        var provider = provider(platform);
        String grantType = platform == SocialPlatform.INSTAGRAM
                ? "ig_exchange_token" : "th_exchange_token";
        String url = tokenApiBase(platform) + "/access_token"
                + "?grant_type=" + encode(grantType)
                + "&client_secret=" + encode(provider.getAppSecret())
                + "&access_token=" + encode(shortToken);
        Map<String, Object> response = getMap(url);
        String longToken = stringValue(response.get("access_token"));
        long expiresIn = longValue(response.get("expires_in"), 5_184_000L);
        AccountProfile profile = getProfile(platform, longToken);
        String userId = profile.userId() != null ? profile.userId() : userIdFromExchange;
        return new TokenResult(longToken, userId, profile.username(), expiresIn);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> postForm(String url, MultiValueMap<String, String> form, boolean outcomeMayBeUncertain) {
        try {
            Map<String, Object> body = restClient.post().uri(URI.create(url))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            return body != null ? body : Map.of();
        } catch (ResourceAccessException e) {
            throw new SocialProviderException("NETWORK_ERROR", "Meta API network error.",
                    true, outcomeMayBeUncertain, e);
        } catch (RestClientResponseException e) {
            boolean retryable = e.getStatusCode().value() == 429 || e.getStatusCode().is5xxServerError();
            throw new SocialProviderException("HTTP_" + e.getStatusCode().value(),
                    safeProviderMessage(e), retryable, false, e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(String url) {
        try {
            Map<String, Object> body = restClient.get().uri(URI.create(url)).retrieve().body(Map.class);
            return body != null ? body : Map.of();
        } catch (ResourceAccessException e) {
            throw new SocialProviderException("NETWORK_ERROR", "Meta API network error.", true, false, e);
        } catch (RestClientResponseException e) {
            boolean retryable = e.getStatusCode().value() == 429 || e.getStatusCode().is5xxServerError();
            throw new SocialProviderException("HTTP_" + e.getStatusCode().value(),
                    safeProviderMessage(e), retryable, false, e);
        }
    }

    private SocialPublishingProperties.Provider provider(SocialPlatform platform) {
        return platform == SocialPlatform.INSTAGRAM ? properties.getInstagram() : properties.getThreads();
    }

    private String codeExchangeBase(SocialPlatform platform) {
        return provider(platform).getOauthApiBaseUrl().replaceAll("/+$", "");
    }

    private String tokenApiBase(SocialPlatform platform) {
        return platform == SocialPlatform.INSTAGRAM
                ? provider(platform).getApiBaseUrl().replaceAll("/+$", "")
                : codeExchangeBase(platform);
    }

    private static String safeProviderMessage(RestClientResponseException e) {
        return "Meta API returned HTTP " + e.getStatusCode().value() + " " + e.getStatusText();
    }

    private static String requiredId(Map<String, Object> response) {
        String id = stringValue(response.get("id"));
        if (id == null) throw new SocialProviderException(
                "INVALID_RESPONSE", "Meta API response did not contain an id.", false, false, null);
        return id;
    }

    private static String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static long longValue(Object value, long fallback) {
        if (value instanceof Number number) return number.longValue();
        try {
            return value == null ? fallback : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static String encodePath(String value) {
        if (value == null || !value.matches("[A-Za-z0-9._-]+")) {
            throw new IllegalArgumentException("Invalid Meta resource id.");
        }
        return value;
    }

    public record TokenResult(String accessToken, String userId, String username, long expiresInSeconds) {}
    public record AccountProfile(String userId, String username) {}
    public record PublishedMedia(String mediaId, String permalink) {}
}
