package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MetaSocialClientTest {

    private HttpServer server;
    private String baseUrl;
    private final List<RecordedRequest> requests = new CopyOnWriteArrayList<>();

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.start();
        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    void instagramAuthorizationUsesCurrentReauthenticationParameter() {
        MetaSocialClient client = new MetaSocialClient(properties());

        String url = client.authorizationUrl(SocialPlatform.INSTAGRAM, "csrf state");

        assertThat(url)
                .contains("force_reauth=true")
                .contains("state=csrf+state")
                .contains("scope=instagram_business_basic%2Cinstagram_business_content_publish")
                .doesNotContain("force_authentication")
                .doesNotContain("enable_fb_login");
    }

    @Test
    void refreshInstagramTokenUsesUnversionedTokenHostAndVersionedProfileHost() {
        MetaSocialClient client = new MetaSocialClient(properties());

        MetaSocialClient.TokenResult result =
                client.refreshLongLived(SocialPlatform.INSTAGRAM, "old-token");

        assertThat(result).isEqualTo(
                new MetaSocialClient.TokenResult("new-token", "ig-user", "official_ig", 5_184_000L));
        assertThat(requests).extracting(RecordedRequest::path)
                .containsExactly("/ig-token/refresh_access_token", "/ig/v25.0/me");
        assertThat(requests.get(0).query())
                .containsEntry("grant_type", "ig_refresh_token")
                .containsEntry("access_token", "old-token");
        assertThat(requests.get(1).query().get("fields")).isEqualTo("user_id,username");
    }

    @Test
    void authorizationCodeExchangeUsesPlatformSpecificOAuthAndTokenEndpoints() {
        MetaSocialClient client = new MetaSocialClient(properties());

        MetaSocialClient.TokenResult instagram =
                client.exchangeCode(SocialPlatform.INSTAGRAM, "ig-code");
        MetaSocialClient.TokenResult threads =
                client.exchangeCode(SocialPlatform.THREADS, "threads-code");

        assertThat(instagram.accessToken()).isEqualTo("long-ig-token");
        assertThat(threads.accessToken()).isEqualTo("long-threads-token");

        assertThat(requestFor("/ig-oauth/oauth/access_token").form())
                .containsEntry("client_id", "instagram-app")
                .containsEntry("client_secret", "instagram-secret")
                .containsEntry("grant_type", "authorization_code")
                .containsEntry("code", "ig-code");
        assertThat(requestFor("/ig-token/access_token").query())
                .containsEntry("grant_type", "ig_exchange_token")
                .containsEntry("client_secret", "instagram-secret")
                .containsEntry("access_token", "short-ig-token");
        assertThat(requestFor("/threads-oauth/oauth/access_token").form())
                .containsEntry("client_id", "threads-app")
                .containsEntry("client_secret", "threads-secret")
                .containsEntry("grant_type", "authorization_code")
                .containsEntry("code", "threads-code");
        assertThat(requestFor("/threads-token/access_token").query())
                .containsEntry("grant_type", "th_exchange_token")
                .containsEntry("client_secret", "threads-secret")
                .containsEntry("access_token", "short-threads-token");
    }

    @Test
    void profileAndContainerStatusFieldsAreSeparatedByPlatform() {
        MetaSocialClient client = new MetaSocialClient(properties());

        MetaSocialClient.AccountProfile threadsProfile =
                client.getProfile(SocialPlatform.THREADS, "threads-token");
        client.waitUntilContainerReady(SocialPlatform.INSTAGRAM, "ig-token", "ig-container");
        client.waitUntilContainerReady(SocialPlatform.THREADS, "threads-token", "th-container");

        assertThat(threadsProfile).isEqualTo(
                new MetaSocialClient.AccountProfile("threads-user", "official_threads"));
        assertThat(requestFor("/threads/v1.0/me").query().get("fields"))
                .isEqualTo("id,username");
        assertThat(requestFor("/ig/v25.0/ig-container").query().get("fields"))
                .isEqualTo("status_code,status");
        assertThat(requestFor("/threads/v1.0/th-container").query().get("fields"))
                .isEqualTo("id,status,error_message");
    }

    @Test
    void imageContainerAndPublishFormsFollowEachPlatformContract() {
        MetaSocialClient client = new MetaSocialClient(properties());

        String igContainer = client.createImageContainer(
                SocialPlatform.INSTAGRAM, "ig-user", "ig-token",
                "https://www.caskbycask.net/image.jpg", "instagram caption");
        String thContainer = client.createImageContainer(
                SocialPlatform.THREADS, "threads-user", "threads-token",
                "https://www.caskbycask.net/image.jpg", "threads text");
        String thMedia = client.publishContainer(
                SocialPlatform.THREADS, "threads-user", "threads-token", thContainer);

        assertThat(igContainer).isEqualTo("ig-container");
        assertThat(thContainer).isEqualTo("threads-container");
        assertThat(thMedia).isEqualTo("threads-media");

        assertThat(requestFor("/ig/v25.0/ig-user/media").form())
                .containsEntry("access_token", "ig-token")
                .containsEntry("image_url", "https://www.caskbycask.net/image.jpg")
                .containsEntry("caption", "instagram caption")
                .doesNotContainKeys("media_type", "text");
        assertThat(requestFor("/threads/v1.0/threads-user/threads").form())
                .containsEntry("access_token", "threads-token")
                .containsEntry("image_url", "https://www.caskbycask.net/image.jpg")
                .containsEntry("media_type", "IMAGE")
                .containsEntry("text", "threads text")
                .doesNotContainKey("caption");
        assertThat(requestFor("/threads/v1.0/threads-user/threads_publish").form())
                .containsEntry("access_token", "threads-token")
                .containsEntry("creation_id", "threads-container");
    }

    @Test
    void carouselFormsPreserveImageOrderForInstagramAndThreads() {
        MetaSocialClient client = new MetaSocialClient(properties());
        List<String> imageUrls = List.of(
                "https://www.caskbycask.net/cover.jpg",
                "https://www.caskbycask.net/proof-1.jpg",
                "https://www.caskbycask.net/proof-2.jpg",
                "https://www.caskbycask.net/proof-3.jpg",
                "https://www.caskbycask.net/proof-4.jpg");

        client.createImageCarouselContainer(
                SocialPlatform.INSTAGRAM, "ig-user", "ig-token", imageUrls, "instagram caption");

        List<RecordedRequest> instagramPosts = requests.stream()
                .filter(request -> "POST".equals(request.method()))
                .filter(request -> "/ig/v25.0/ig-user/media".equals(request.path()))
                .toList();
        assertThat(instagramPosts).hasSize(6);
        assertThat(instagramPosts.subList(0, 5))
                .extracting(request -> request.form().get("image_url"))
                .containsExactlyElementsOf(imageUrls);
        assertThat(instagramPosts.subList(0, 5))
                .allSatisfy(request -> assertThat(request.form())
                        .containsEntry("is_carousel_item", "true")
                        .doesNotContainKeys("caption", "text"));
        assertThat(instagramPosts.get(5).form())
                .containsEntry("media_type", "CAROUSEL")
                .containsEntry("children",
                        "ig-container,ig-container,ig-container,ig-container,ig-container")
                .containsEntry("caption", "instagram caption");

        requests.clear();
        client.createImageCarouselContainer(
                SocialPlatform.THREADS, "threads-user", "threads-token", imageUrls, "threads text");

        List<RecordedRequest> threadsPosts = requests.stream()
                .filter(request -> "POST".equals(request.method()))
                .filter(request -> "/threads/v1.0/threads-user/threads".equals(request.path()))
                .toList();
        assertThat(threadsPosts).hasSize(6);
        assertThat(threadsPosts.subList(0, 5))
                .extracting(request -> request.form().get("image_url"))
                .containsExactlyElementsOf(imageUrls);
        assertThat(threadsPosts.subList(0, 5))
                .allSatisfy(request -> assertThat(request.form())
                        .containsEntry("is_carousel_item", "true")
                        .containsEntry("media_type", "IMAGE")
                        .doesNotContainKeys("caption", "text"));
        assertThat(threadsPosts.get(5).form())
                .containsEntry("media_type", "CAROUSEL")
                .containsEntry("children",
                        "threads-container,threads-container,threads-container,"
                                + "threads-container,threads-container")
                .containsEntry("text", "threads text");
    }

    @Test
    void recentMediaRecoveryUsesPlatformFieldsAndSinceBoundary() {
        MetaSocialClient client = new MetaSocialClient(properties());
        LocalDateTime since = LocalDateTime.of(2026, 7, 25, 12, 0);

        MetaSocialClient.PublishedMedia instagram = client.findRecentByCaption(
                SocialPlatform.INSTAGRAM, "ig-user", "ig-token", "same body", since).orElseThrow();
        MetaSocialClient.PublishedMedia threads = client.findRecentByCaption(
                SocialPlatform.THREADS, "threads-user", "threads-token", "same body", since).orElseThrow();

        assertThat(instagram).isEqualTo(
                new MetaSocialClient.PublishedMedia("ig-new", "https://instagram.com/p/new"));
        assertThat(threads).isEqualTo(
                new MetaSocialClient.PublishedMedia("th-new", "https://threads.net/t/new"));

        RecordedRequest igRequest = requestFor("/ig/v25.0/ig-user/media");
        assertThat(igRequest.query().get("fields")).isEqualTo("id,permalink,caption,timestamp");
        assertThat(igRequest.query()).doesNotContainKey("since");

        RecordedRequest threadsRequest = requestFor("/threads/v1.0/threads-user/threads");
        assertThat(threadsRequest.query().get("fields")).isEqualTo("id,permalink,text,timestamp");
        assertThat(threadsRequest.query().get("since")).isEqualTo("1784948400");
    }

    @Test
    void publishServerErrorIsTreatedAsUncertainToPreventDuplicateRetry() {
        MetaSocialClient client = new MetaSocialClient(properties());

        assertThatThrownBy(() -> client.publishContainer(
                SocialPlatform.INSTAGRAM, "ig-user", "ig-token", "server-error"))
                .isInstanceOfSatisfying(SocialProviderException.class, error -> {
                    assertThat(error.getProviderCode()).isEqualTo("HTTP_500");
                    assertThat(error.isRetryable()).isTrue();
                    assertThat(error.isOutcomeUncertain()).isTrue();
                });
    }

    private SocialPublishingProperties properties() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setOauthRedirectUri("https://www.caskbycask.net/api/admin/social/accounts/oauth/callback");
        properties.setConnectTimeout(Duration.ofSeconds(1));
        properties.setReadTimeout(Duration.ofSeconds(1));

        configure(properties.getInstagram(), "instagram-app", "instagram-secret",
                "https://www.instagram.com/oauth/authorize",
                baseUrl + "/ig-oauth", baseUrl + "/ig-token", baseUrl + "/ig/v25.0",
                "instagram_business_basic,instagram_business_content_publish");
        configure(properties.getThreads(), "threads-app", "threads-secret",
                "https://threads.net/oauth/authorize",
                baseUrl + "/threads-oauth", baseUrl + "/threads-token", baseUrl + "/threads/v1.0",
                "threads_basic,threads_content_publish");
        return properties;
    }

    private static void configure(
            SocialPublishingProperties.Provider provider,
            String appId,
            String appSecret,
            String authorizationUrl,
            String oauthApiBaseUrl,
            String tokenApiBaseUrl,
            String apiBaseUrl,
            String scopes
    ) {
        provider.setAppId(appId);
        provider.setAppSecret(appSecret);
        provider.setAuthorizationUrl(authorizationUrl);
        provider.setOauthApiBaseUrl(oauthApiBaseUrl);
        provider.setTokenApiBaseUrl(tokenApiBaseUrl);
        provider.setApiBaseUrl(apiBaseUrl);
        provider.setScopes(scopes);
    }

    private void handle(HttpExchange exchange) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        RecordedRequest request = new RecordedRequest(
                exchange.getRequestMethod(),
                exchange.getRequestURI().getPath(),
                decode(exchange.getRequestURI().getRawQuery()),
                decode(body));
        requests.add(request);

        String response = switch (request.path()) {
            case "/ig-oauth/oauth/access_token" ->
                    "{\"access_token\":\"short-ig-token\",\"user_id\":\"ig-user\"}";
            case "/threads-oauth/oauth/access_token" ->
                    "{\"access_token\":\"short-threads-token\",\"user_id\":\"threads-user\"}";
            case "/ig-token/access_token" ->
                    "{\"access_token\":\"long-ig-token\",\"expires_in\":5184000}";
            case "/threads-token/access_token" ->
                    "{\"access_token\":\"long-threads-token\",\"expires_in\":5184000}";
            case "/ig-token/refresh_access_token" ->
                    "{\"access_token\":\"new-token\",\"expires_in\":5184000}";
            case "/ig/v25.0/me" ->
                    "{\"user_id\":\"ig-user\",\"username\":\"official_ig\"}";
            case "/threads/v1.0/me" ->
                    "{\"id\":\"threads-user\",\"username\":\"official_threads\"}";
            case "/ig/v25.0/ig-container" ->
                    "{\"status_code\":\"FINISHED\",\"status\":\"Finished\"}";
            case "/threads/v1.0/th-container" ->
                    "{\"id\":\"th-container\",\"status\":\"FINISHED\"}";
            case "/threads/v1.0/threads-container" ->
                    "{\"id\":\"threads-container\",\"status\":\"FINISHED\"}";
            case "/ig/v25.0/ig-user/media" -> "GET".equals(request.method())
                    ? """
                    {"data":[
                      {"id":"ig-old","permalink":"https://instagram.com/p/old","caption":"same body",
                       "timestamp":"2026-07-25T02:00:00+0000"},
                      {"id":"ig-new","permalink":"https://instagram.com/p/new","caption":"same body",
                       "timestamp":"2026-07-25T03:00:00+0000"}
                    ]}
                    """
                    : "{\"id\":\"ig-container\"}";
            case "/threads/v1.0/threads-user/threads" -> "GET".equals(request.method())
                    ? """
                    {"data":[
                      {"id":"th-old","permalink":"https://threads.net/t/old","text":"same body",
                       "timestamp":"2026-07-25T02:00:00+0000"},
                      {"id":"th-new","permalink":"https://threads.net/t/new","text":"same body",
                       "timestamp":"2026-07-25T03:00:00+0000"}
                    ]}
                    """
                    : "{\"id\":\"threads-container\"}";
            case "/threads/v1.0/threads-user/threads_publish" ->
                    "{\"id\":\"threads-media\"}";
            case "/ig/v25.0/ig-user/media_publish" -> {
                if ("server-error".equals(request.form().get("creation_id"))) {
                    byte[] error = "{\"error\":{\"message\":\"temporary\"}}"
                            .getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(500, error.length);
                    exchange.getResponseBody().write(error);
                    exchange.close();
                    yield null;
                }
                yield "{\"id\":\"ig-media\"}";
            }
            default -> "{\"id\":\"ok\"}";
        };

        if (response == null) return;
        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private RecordedRequest requestFor(String path) {
        return requests.stream()
                .filter(request -> path.equals(request.path()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Request not found: " + path));
    }

    private static Map<String, String> decode(String encoded) {
        Map<String, String> values = new LinkedHashMap<>();
        if (encoded == null || encoded.isBlank()) return values;
        for (String part : encoded.split("&")) {
            String[] pair = part.split("=", 2);
            String key = URLDecoder.decode(pair[0], StandardCharsets.UTF_8);
            String value = pair.length == 2
                    ? URLDecoder.decode(pair[1], StandardCharsets.UTF_8)
                    : "";
            values.put(key, value);
        }
        return values;
    }

    private record RecordedRequest(
            String method,
            String path,
            Map<String, String> query,
            Map<String, String> form
    ) {
    }
}
