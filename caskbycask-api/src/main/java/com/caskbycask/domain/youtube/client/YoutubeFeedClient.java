package com.caskbycask.domain.youtube.client;

import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 유튜브 영상 및 채널 정보를 수집한다.
 * <p>
 * <b>YouTube Data API v3 우선 지원</b>: {@code youtube.api-key} 가 설정되어 있으면 공식 Data API v3 를
 * 우선 사용해 OCI/AWS 등 클라우드 환경에서도 IP 차단 없이 안정적으로 수집한다.
 * <p>
 * API 키가 없거나 할당량 초과 시 <b>공개 RSS 피드 및 HTML 스크래핑</b>으로 자동 폴백한다.
 * 피드는 채널당 <b>최신 15편</b>만 담기므로 오래된 영상은 관리자가 URL 로 직접 등록한다.
 */
@Slf4j
@Component
public class YoutubeFeedClient {

    private static final String FEED_HOST = "https://www.youtube.com";
    private static final String API_HOST = "https://www.googleapis.com/youtube/v3";
    private static final int MAX_HTML_BYTES = 3 * 1024 * 1024;
    private static final int MAX_FEED_BYTES = 2 * 1024 * 1024;
    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private static final Pattern CHANNEL_ID_IN_FEED_LINK =
            Pattern.compile("channel_id=(UC[A-Za-z0-9_-]{22})");
    private static final Pattern CHANNEL_ID_IN_EXTERNAL_ID =
            Pattern.compile("\"externalId\"\\s*:\\s*\"(UC[A-Za-z0-9_-]{22})\"");
    private static final Pattern CHANNEL_ID_IN_CHANNEL_ID =
            Pattern.compile("\"channelId\"\\s*:\\s*\"(UC[A-Za-z0-9_-]{22})\"");
    private static final Pattern CHANNEL_ID_IN_BROWSE_ID =
            Pattern.compile("\"browseId\"\\s*:\\s*\"(UC[A-Za-z0-9_-]{22})\"");
    private static final Pattern CHANNEL_ID_IN_ITEMPROP =
            Pattern.compile("itemprop=\"channelId\"\\s+content=\"(UC[A-Za-z0-9_-]{22})\"");
    private static final Pattern CHANNEL_ID_IN_CANONICAL =
            Pattern.compile("/channel/(UC[A-Za-z0-9_-]{22})");

    private static final Pattern HANDLE_IN_CANONICAL_BASE =
            Pattern.compile("\"canonicalBaseUrl\"\\s*:\\s*\"/@([A-Za-z0-9._-]{3,30})\"");
    private static final Pattern HANDLE_IN_VANITY_URL =
            Pattern.compile("\"vanityChannelUrl\"\\s*:\\s*\"[^\"]*?/@([A-Za-z0-9._-]{3,30})\"");
    private static final Pattern AVATAR_IN_OG_IMAGE =
            Pattern.compile("<meta[^>]+property=\"og:image\"[^>]+content=\"([^\"]+)\"");
    private static final Pattern AVATAR_IN_HTML =
            Pattern.compile("\"avatar\"\\s*:\\s*\\{\"thumbnails\":\\[\\{\"url\":\"([^\"]+)\"");

    private final String apiKey;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public YoutubeFeedClient(
            @Value("${youtube.api-key:}") String apiKey,
            @Value("${youtube.feed.connect-timeout-ms:3000}") long connectTimeoutMs,
            @Value("${youtube.feed.read-timeout-ms:10000}") long readTimeoutMs,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey != null && !apiKey.isBlank() ? apiKey.trim() : null;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                // 일반 브라우저 User-Agent 및 헤더로 WAF 봇 차단을 방지한다.
                .defaultHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
                .defaultHeader("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
                .defaultHeader("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
                .defaultHeader("Sec-Ch-Ua", "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"")
                .defaultHeader("Sec-Ch-Ua-Mobile", "?0")
                .defaultHeader("Sec-Ch-Ua-Platform", "\"Windows\"")
                .defaultHeader("Sec-Fetch-Dest", "document")
                .defaultHeader("Sec-Fetch-Mode", "navigate")
                .defaultHeader("Sec-Fetch-Site", "none")
                .defaultHeader("Sec-Fetch-User", "?1")
                .defaultHeader("Upgrade-Insecure-Requests", "1")
                .build();
    }

    /** 피드에서 읽어 온 영상 한 편. 엔티티로 옮기기 전의 순수 값이다. */
    public record FeedVideo(
            String videoKey,
            String title,
            String description,
            String thumbnailUrl,
            LocalDateTime publishedAt,
            YoutubeVideoType videoType
    ) {
    }

    /** 채널 피드 최상단의 채널 정보. */
    public record FeedChannel(String channelKey, String title) {
    }

    /** 채널 페이지 한 번 읽어서 얻은 것. 못 읽은 항목은 null 이다. */
    public record ChannelPageInfo(String channelKey, String handle, String thumbnailUrl) {
    }

    /**
     * 채널 페이지에서 채널 ID 와 프로필 이미지를 읽는다.
     */
    public ChannelPageInfo fetchChannelPageInfo(String handle, String channelKey) {
        if (hasApiKey()) {
            try {
                ChannelPageInfo info = fetchChannelPageInfoViaApi(handle, channelKey);
                if (info != null && (info.channelKey() != null || info.handle() != null)) {
                    return info;
                }
            } catch (Exception e) {
                log.warn("유튜브 Data API 로 채널 정보 조회 실패 (RSS/HTML 로 폴백): handle={}, channelKey={}, error={}",
                        handle, channelKey, e.getMessage());
            }
        }

        String url = channelKey != null
                ? UriComponentsBuilder.fromUriString(FEED_HOST)
                        .path("/channel/{channelKey}").buildAndExpand(channelKey).toUriString()
                : UriComponentsBuilder.fromUriString(FEED_HOST)
                        .path("/@{handle}").buildAndExpand(handle).toUriString();

        HttpFetchResult result = getLimitedWithStatus(url, MAX_HTML_BYTES);
        String html = result.body();
        if (html == null) {
            log.warn("유튜브 채널 페이지를 읽지 못했다: url={}, status={}", url, result.statusCode());
            return new ChannelPageInfo(channelKey, handle, null);
        }
        return new ChannelPageInfo(
                channelKey != null ? channelKey : findFirst(html,
                        CHANNEL_ID_IN_FEED_LINK, CHANNEL_ID_IN_EXTERNAL_ID, CHANNEL_ID_IN_CHANNEL_ID,
                        CHANNEL_ID_IN_BROWSE_ID, CHANNEL_ID_IN_ITEMPROP, CHANNEL_ID_IN_CANONICAL),
                handle != null ? handle : findFirst(html, HANDLE_IN_CANONICAL_BASE, HANDLE_IN_VANITY_URL),
                findAvatar(html));
    }

    private String findFirst(String html, Pattern... patterns) {
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(html);
            if (matcher.find()) return matcher.group(1);
        }
        return null;
    }

    private String findAvatar(String html) {
        Matcher og = AVATAR_IN_OG_IMAGE.matcher(html);
        if (og.find()) return unescapeJsonUrl(og.group(1));
        Matcher json = AVATAR_IN_HTML.matcher(html);
        return json.find() ? unescapeJsonUrl(json.group(1)) : null;
    }

    /** 채널 피드 헤더에서 채널명을 읽는다. 등록 시 기본 채널명으로 쓴다. */
    public FeedChannel fetchChannelHeader(String channelKey) {
        if (hasApiKey()) {
            try {
                FeedChannel header = fetchChannelHeaderViaApi(channelKey);
                if (header != null) return header;
            } catch (Exception e) {
                log.warn("유튜브 Data API 로 채널 헤더 조회 실패: channelKey={}, error={}", channelKey, e.getMessage());
            }
        }

        Document document = getFeedDocument(channelFeedUrl(channelKey)).document();
        if (document == null) return null;
        String title = firstChildText(document.getDocumentElement(), "title");
        return title == null ? null : new FeedChannel(channelKey, title);
    }

    /**
     * 채널의 최신 영상 목록(피드 상한 = 채널당 15편).
     * <p>
     * 1순위: YouTube Data API v3 (API 키 설정 시)<br>
     * 2순위: 롱폼(UULF) + 숏츠(UUSH) 갈래 피드<br>
     * 3순위: 전체 업로드(UU) 플레이리스트 피드<br>
     * 4순위: 채널 피드(channel_id=UC...)
     */
    public List<FeedVideo> fetchLatestVideos(String channelKey) {
        if (hasApiKey()) {
            try {
                List<FeedVideo> apiVideos = fetchLatestVideosViaApi(channelKey);
                if (!apiVideos.isEmpty()) {
                    return apiVideos;
                }
            } catch (Exception e) {
                log.warn("유튜브 Data API 로 영상 수집 실패 (RSS 피드로 폴백): channelKey={}, error={}",
                        channelKey, e.getMessage());
            }
        }

        Map<String, FeedVideo> merged = new LinkedHashMap<>();
        String suffix = channelKey.length() > 2 ? channelKey.substring(2) : null;
        int lastErrorCode = 200;

        if (suffix != null) {
            FeedFetchResult lf = readFeedWithStatus(playlistFeedUrl("UULF" + suffix), YoutubeVideoType.VIDEO);
            FeedFetchResult sh = readFeedWithStatus(playlistFeedUrl("UUSH" + suffix), YoutubeVideoType.SHORTS);
            if (lf.statusCode() >= 400) lastErrorCode = lf.statusCode();
            if (sh.statusCode() >= 400) lastErrorCode = sh.statusCode();

            for (FeedVideo video : lf.videos()) merged.putIfAbsent(video.videoKey(), video);
            for (FeedVideo video : sh.videos()) merged.putIfAbsent(video.videoKey(), video);

            if (merged.isEmpty()) {
                FeedFetchResult uu = readFeedWithStatus(playlistFeedUrl("UU" + suffix), YoutubeVideoType.VIDEO);
                if (uu.statusCode() >= 400) lastErrorCode = uu.statusCode();
                for (FeedVideo video : uu.videos()) merged.putIfAbsent(video.videoKey(), video);
            }
        }

        if (merged.isEmpty()) {
            log.info("유튜브 갈래 피드가 비어 채널 피드로 대체한다: channelKey={}", channelKey);
            FeedFetchResult ch = readFeedWithStatus(channelFeedUrl(channelKey), YoutubeVideoType.VIDEO);
            if (ch.statusCode() >= 400) lastErrorCode = ch.statusCode();
            for (FeedVideo video : ch.videos()) merged.putIfAbsent(video.videoKey(), video);
        }

        if (merged.isEmpty() && lastErrorCode >= 400) {
            if (lastErrorCode == 403) {
                throw new YoutubeBlockedException("유튜브에서 요청이 차단되었습니다(HTTP 403 Forbidden). YouTube API 키 설정을 권장합니다.");
            }
            if (lastErrorCode == 429) {
                throw new YoutubeRateLimitedException("유튜브 요청 한도 초과(HTTP 429 Too Many Requests). 잠시 후 다시 시도해주세요.");
            }
            throw new YoutubeFetchException("유튜브 피드 요청 실패(HTTP " + lastErrorCode + ")");
        }

        return new ArrayList<>(merged.values());
    }

    /** 영상 한 편의 메타데이터. 관리자가 URL 로 직접 등록할 때 제목·썸네일을 채우는 데 쓴다. */
    public FeedVideo fetchSingleVideo(String videoKey, YoutubeVideoType videoType) {
        if (hasApiKey()) {
            try {
                FeedVideo apiVideo = fetchSingleVideoViaApi(videoKey, videoType);
                if (apiVideo != null) return apiVideo;
            } catch (Exception e) {
                log.warn("유튜브 Data API 로 단건 영상 조회 실패: videoKey={}, error={}", videoKey, e.getMessage());
            }
        }

        String url = UriComponentsBuilder.fromUriString(FEED_HOST)
                .path("/oembed")
                .queryParam("url", "https://www.youtube.com/watch?v=" + videoKey)
                .queryParam("format", "json")
                .build()
                .toUriString();
        String json = getLimited(url, MAX_HTML_BYTES);
        if (json == null) return null;

        String title = extractJsonString(json, "title");
        if (title == null) return null;
        return new FeedVideo(
                videoKey,
                title,
                null,
                "https://i.ytimg.com/vi/" + videoKey + "/hqdefault.jpg",
                LocalDateTime.now(SERVICE_ZONE),
                videoType);
    }

    public enum VideoAvailability {
        AVAILABLE,
        GONE,
        RESTRICTED,
        UNKNOWN
    }

    public VideoAvailability checkAvailability(String videoKey) {
        String url = UriComponentsBuilder.fromUriString(FEED_HOST)
                .path("/oembed")
                .queryParam("url", "https://www.youtube.com/watch?v=" + videoKey)
                .queryParam("format", "json")
                .build()
                .toUriString();
        try {
            return restClient.get().uri(url).exchange((request, response) -> {
                int status = response.getStatusCode().value();
                if (status == 200) return VideoAvailability.AVAILABLE;
                if (status == 404) return VideoAvailability.GONE;
                if (status == 401 || status == 403) return VideoAvailability.RESTRICTED;
                log.warn("유튜브 가용성 확인이 예상 밖 상태를 받았다: videoKey={}, status={}", videoKey, status);
                return VideoAvailability.UNKNOWN;
            });
        } catch (RuntimeException e) {
            log.warn("유튜브 가용성 확인 실패: videoKey={}, error={}", videoKey, e.toString());
            return VideoAvailability.UNKNOWN;
        }
    }

    public String fetchVideoAuthorUrl(String videoKey) {
        String url = UriComponentsBuilder.fromUriString(FEED_HOST)
                .path("/oembed")
                .queryParam("url", "https://www.youtube.com/watch?v=" + videoKey)
                .queryParam("format", "json")
                .build()
                .toUriString();
        String json = getLimited(url, MAX_HTML_BYTES);
        return json == null ? null : extractJsonString(json, "author_url");
    }

    // ─── Data API v3 내부 ─────────────────────────────────────

    private boolean hasApiKey() {
        return apiKey != null && !apiKey.isBlank();
    }

    private List<FeedVideo> fetchLatestVideosViaApi(String channelKey) {
        String uploadsPlaylistId = channelKey.startsWith("UC") && channelKey.length() == 24
                ? "UU" + channelKey.substring(2)
                : channelKey;

        String url = UriComponentsBuilder.fromUriString(API_HOST)
                .path("/playlistItems")
                .queryParam("part", "snippet")
                .queryParam("playlistId", uploadsPlaylistId)
                .queryParam("maxResults", 15)
                .queryParam("key", apiKey)
                .build()
                .toUriString();

        String body = getLimited(url, MAX_HTML_BYTES);
        if (body == null) return List.of();

        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode items = root.path("items");
            if (!items.isArray() || items.isEmpty()) return List.of();

            List<FeedVideo> videos = new ArrayList<>(items.size());
            for (JsonNode item : items) {
                JsonNode snippet = item.path("snippet");
                String videoKey = snippet.path("resourceId").path("videoId").asText(null);
                String title = snippet.path("title").asText(null);
                if (videoKey == null || title == null) continue;

                String description = snippet.path("description").asText("");
                String publishedAtRaw = snippet.path("publishedAt").asText(null);
                LocalDateTime publishedAt = LocalDateTime.now(SERVICE_ZONE);
                if (publishedAtRaw != null) {
                    try {
                        publishedAt = OffsetDateTime.parse(publishedAtRaw)
                                .atZoneSameInstant(SERVICE_ZONE).toLocalDateTime();
                    } catch (Exception ignored) {
                    }
                }

                String thumbnailUrl = extractThumbnail(snippet.path("thumbnails"), videoKey);

                videos.add(new FeedVideo(
                        videoKey,
                        truncate(title, 300),
                        truncate(description, 1000),
                        thumbnailUrl,
                        publishedAt,
                        YoutubeVideoType.VIDEO));
            }
            return videos;
        } catch (Exception e) {
            log.warn("유튜브 Data API playlistItems JSON 파싱 실패: error={}", e.getMessage());
            return List.of();
        }
    }

    private ChannelPageInfo fetchChannelPageInfoViaApi(String handle, String channelKey) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(API_HOST)
                .path("/channels")
                .queryParam("part", "snippet")
                .queryParam("key", apiKey);

        if (channelKey != null) {
            builder.queryParam("id", channelKey);
        } else if (handle != null) {
            String cleanHandle = handle.startsWith("@") ? handle.substring(1) : handle;
            builder.queryParam("forHandle", cleanHandle);
        } else {
            return null;
        }

        String body = getLimited(builder.build().toUriString(), MAX_HTML_BYTES);
        if (body == null) return null;

        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode items = root.path("items");
            if (!items.isArray() || items.isEmpty()) return null;

            JsonNode item = items.get(0);
            String resolvedId = item.path("id").asText(null);
            JsonNode snippet = item.path("snippet");
            String customUrl = snippet.path("customUrl").asText(null);
            if (customUrl != null && customUrl.startsWith("@")) {
                customUrl = customUrl.substring(1);
            }
            String thumbnailUrl = extractThumbnail(snippet.path("thumbnails"), null);

            return new ChannelPageInfo(
                    resolvedId != null ? resolvedId : channelKey,
                    customUrl != null ? customUrl : handle,
                    thumbnailUrl);
        } catch (Exception e) {
            log.warn("유튜브 Data API channels JSON 파싱 실패: error={}", e.getMessage());
            return null;
        }
    }

    private FeedChannel fetchChannelHeaderViaApi(String channelKey) {
        String url = UriComponentsBuilder.fromUriString(API_HOST)
                .path("/channels")
                .queryParam("part", "snippet")
                .queryParam("id", channelKey)
                .queryParam("key", apiKey)
                .build()
                .toUriString();

        String body = getLimited(url, MAX_HTML_BYTES);
        if (body == null) return null;

        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode items = root.path("items");
            if (!items.isArray() || items.isEmpty()) return null;

            String title = items.get(0).path("snippet").path("title").asText(null);
            return title == null ? null : new FeedChannel(channelKey, title);
        } catch (Exception e) {
            return null;
        }
    }

    private FeedVideo fetchSingleVideoViaApi(String videoKey, YoutubeVideoType videoType) {
        String url = UriComponentsBuilder.fromUriString(API_HOST)
                .path("/videos")
                .queryParam("part", "snippet")
                .queryParam("id", videoKey)
                .queryParam("key", apiKey)
                .build()
                .toUriString();

        String body = getLimited(url, MAX_HTML_BYTES);
        if (body == null) return null;

        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode items = root.path("items");
            if (!items.isArray() || items.isEmpty()) return null;

            JsonNode snippet = items.get(0).path("snippet");
            String title = snippet.path("title").asText(null);
            if (title == null) return null;

            String description = snippet.path("description").asText("");
            String publishedAtRaw = snippet.path("publishedAt").asText(null);
            LocalDateTime publishedAt = LocalDateTime.now(SERVICE_ZONE);
            if (publishedAtRaw != null) {
                try {
                    publishedAt = OffsetDateTime.parse(publishedAtRaw)
                            .atZoneSameInstant(SERVICE_ZONE).toLocalDateTime();
                } catch (Exception ignored) {
                }
            }
            String thumbnailUrl = extractThumbnail(snippet.path("thumbnails"), videoKey);

            return new FeedVideo(
                    videoKey,
                    truncate(title, 300),
                    truncate(description, 1000),
                    thumbnailUrl,
                    publishedAt,
                    videoType);
        } catch (Exception e) {
            return null;
        }
    }

    private String extractThumbnail(JsonNode thumbnails, String videoKey) {
        if (thumbnails != null && !thumbnails.isMissingNode()) {
            if (thumbnails.hasNonNull("maxres")) return thumbnails.path("maxres").path("url").asText();
            if (thumbnails.hasNonNull("standard")) return thumbnails.path("standard").path("url").asText();
            if (thumbnails.hasNonNull("high")) return thumbnails.path("high").path("url").asText();
            if (thumbnails.hasNonNull("medium")) return thumbnails.path("medium").path("url").asText();
            if (thumbnails.hasNonNull("default")) return thumbnails.path("default").path("url").asText();
        }
        return videoKey != null ? "https://i.ytimg.com/vi/" + videoKey + "/hqdefault.jpg" : null;
    }

    // ─── RSS / XML 내부 ──────────────────────────────────────

    private String channelFeedUrl(String channelKey) {
        return UriComponentsBuilder.fromUriString(FEED_HOST)
                .path("/feeds/videos.xml")
                .queryParam("channel_id", channelKey)
                .build()
                .toUriString();
    }

    private String playlistFeedUrl(String playlistId) {
        return UriComponentsBuilder.fromUriString(FEED_HOST)
                .path("/feeds/videos.xml")
                .queryParam("playlist_id", playlistId)
                .build()
                .toUriString();
    }

    private record FeedFetchResult(List<FeedVideo> videos, int statusCode) {
    }

    private FeedFetchResult readFeedWithStatus(String url, YoutubeVideoType videoType) {
        XmlDocumentResult result = getFeedDocument(url);
        if (result.document() == null) {
            return new FeedFetchResult(List.of(), result.statusCode());
        }

        NodeList entries = result.document().getElementsByTagNameNS("http://www.w3.org/2005/Atom", "entry");
        List<FeedVideo> videos = new ArrayList<>(entries.getLength());
        for (int i = 0; i < entries.getLength(); i++) {
            if (!(entries.item(i) instanceof Element entry)) continue;
            FeedVideo video = toFeedVideo(entry, videoType);
            if (video != null) videos.add(video);
        }
        return new FeedFetchResult(videos, result.statusCode());
    }

    private FeedVideo toFeedVideo(Element entry, YoutubeVideoType videoType) {
        String videoKey = firstTextNS(entry, "http://www.youtube.com/xml/schemas/2015", "videoId");
        String title = firstChildText(entry, "title");
        String published = firstChildText(entry, "published");
        if (videoKey == null || title == null || published == null) return null;

        LocalDateTime publishedAt;
        try {
            publishedAt = OffsetDateTime.parse(published).atZoneSameInstant(SERVICE_ZONE).toLocalDateTime();
        } catch (RuntimeException e) {
            log.warn("유튜브 피드 게시일을 해석하지 못했다: videoKey={}, published={}", videoKey, published);
            return null;
        }

        String description = firstTextNS(entry, "http://search.yahoo.com/mrss/", "description");
        String thumbnailUrl = firstAttrNS(entry, "http://search.yahoo.com/mrss/", "thumbnail", "url");

        return new FeedVideo(
                videoKey,
                truncate(title, 300),
                truncate(description, 1000),
                thumbnailUrl != null ? thumbnailUrl
                        : "https://i.ytimg.com/vi/" + videoKey + "/hqdefault.jpg",
                publishedAt,
                videoType);
    }

    private record XmlDocumentResult(Document document, int statusCode) {
    }

    private XmlDocumentResult getFeedDocument(String url) {
        HttpFetchResult fetchResult = getLimitedWithStatus(url, MAX_FEED_BYTES);
        String xml = fetchResult.body();
        if (xml == null) return new XmlDocumentResult(null, fetchResult.statusCode());
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            factory.setNamespaceAware(true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new InputSource(
                    new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8))));
            return new XmlDocumentResult(doc, fetchResult.statusCode());
        } catch (Exception e) {
            log.warn("유튜브 피드 XML 파싱 실패: url={}, error={}", url, e.toString());
            return new XmlDocumentResult(null, fetchResult.statusCode());
        }
    }

    private record HttpFetchResult(String body, int statusCode) {
    }

    private String getLimited(String url, int maxBytes) {
        return getLimitedWithStatus(url, maxBytes).body();
    }

    private HttpFetchResult getLimitedWithStatus(String url, int maxBytes) {
        try {
            return restClient.get()
                    .uri(url)
                    .exchange((request, response) -> {
                        int status = response.getStatusCode().value();
                        if (response.getStatusCode().isError()) {
                            log.warn("유튜브 요청 실패: url={}, status={}", url, status);
                            return new HttpFetchResult(null, status);
                        }
                        String body = readLimited(response.getBody(), maxBytes);
                        return new HttpFetchResult(body, status);
                    });
        } catch (RuntimeException e) {
            log.warn("유튜브 요청 예외: url={}, error={}", url, e.toString());
            return new HttpFetchResult(null, 500);
        }
    }

    private String readLimited(InputStream input, int maxBytes) throws IOException {
        if (input == null) return null;
        byte[] buffer = new byte[8192];
        byte[] result = new byte[Math.min(maxBytes, 64 * 1024)];
        int total = 0;
        int read;
        while (total < maxBytes && (read = input.read(buffer)) != -1) {
            int copy = Math.min(read, maxBytes - total);
            if (total + copy > result.length) {
                byte[] grown = new byte[Math.min(maxBytes, Math.max(result.length * 2, total + copy))];
                System.arraycopy(result, 0, grown, 0, total);
                result = grown;
            }
            System.arraycopy(buffer, 0, result, total, copy);
            total += copy;
        }
        return new String(result, 0, total, StandardCharsets.UTF_8);
    }

    private static String firstChildText(Element parent, String localName) {
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node node = children.item(i);
            if (node instanceof Element element && localName.equals(element.getLocalName())) {
                String text = element.getTextContent();
                return text == null || text.isBlank() ? null : text.trim();
            }
        }
        return null;
    }

    private static String firstTextNS(Element parent, String namespace, String localName) {
        NodeList nodes = parent.getElementsByTagNameNS(namespace, localName);
        if (nodes.getLength() == 0) return null;
        String text = nodes.item(0).getTextContent();
        return text == null || text.isBlank() ? null : text.trim();
    }

    private static String firstAttrNS(Element parent, String namespace, String localName, String attribute) {
        NodeList nodes = parent.getElementsByTagNameNS(namespace, localName);
        if (nodes.getLength() == 0 || !(nodes.item(0) instanceof Element element)) return null;
        String value = element.getAttribute(attribute);
        return value.isBlank() ? null : value;
    }

    private static String extractJsonString(String json, String field) {
        Matcher matcher = Pattern.compile("\"" + Pattern.quote(field) + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"")
                .matcher(json);
        if (!matcher.find()) return null;
        return matcher.group(1)
                .replace("\\\"", "\"")
                .replace("\\/", "/")
                .replace("\\\\", "\\");
    }

    private static String unescapeJsonUrl(String value) {
        return value.replace("\\u0026", "&").replace("\\/", "/").replace("\\u003d", "=");
    }

    private static String truncate(String value, int max) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }

    // ─── 예외 클래스 ──────────────────────────────────────────

    public static class YoutubeFetchException extends RuntimeException {
        public YoutubeFetchException(String message) {
            super(message);
        }
    }

    public static class YoutubeBlockedException extends YoutubeFetchException {
        public YoutubeBlockedException(String message) {
            super(message);
        }
    }

    public static class YoutubeRateLimitedException extends YoutubeFetchException {
        public YoutubeRateLimitedException(String message) {
            super(message);
        }
    }
}

