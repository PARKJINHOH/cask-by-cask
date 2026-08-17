package com.caskbycask.domain.youtube.client;

import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoType;
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
 * 유튜브 공개 RSS 피드에서 채널의 최신 영상을 읽어 온다.
 * <p>
 * <b>Data API 키를 쓰지 않는다.</b> 그래서 조회수·재생시간은 애초에 받아오지 않고,
 * 목록과 임베드에 필요한 것(영상 ID·제목·설명·썸네일·게시일)만 가져온다.
 * 피드는 채널당 <b>최신 15편</b>만 담기므로, 이 클래스가 하는 일은 "새 영상 따라잡기"지
 * "과거 영상 전량 수집"이 아니다. 오래된 영상은 관리자가 URL 로 직접 등록한다.
 * <p>
 * 숏츠 구분은 채널 업로드 플레이리스트의 갈래를 이용한다 — 채널 ID {@code UCxxxx} 에 대해
 * {@code UULFxxxx} 는 롱폼만, {@code UUSHxxxx} 는 숏츠만 담긴다. 유튜브가 문서로 보장한
 * 규칙은 아니므로 <b>실패하면 채널 피드 하나로 떨어지고 전부 VIDEO 로 표시</b>한다.
 * 그 경우 관리자가 목록에서 유형을 바로잡을 수 있고, 자동 수집은 유형을 덮어쓰지 않는다.
 */
@Slf4j
@Component
public class YoutubeFeedClient {

    private static final String FEED_HOST = "https://www.youtube.com";
    /**
     * 채널 HTML 읽기 상한.
     * <p>
     * 넉넉해 보이지만 그래야 한다 — 유튜브는 {@code <head>} 의 메타태그 <b>앞에</b> 1MB 가까운
     * 인라인 스크립트를 싣는다. 2026-08 기준 실측으로 채널 ID·og:image 가 약 720KB 지점,
     * 아바타 JSON 이 약 1,050KB 지점에 있었다. 상한을 여기서 낮추면 프로필을 조용히 못 읽는다
     * (예전 512KB 상한이 정확히 그 증상이었다).
     * <p>이 요청은 채널 등록·프로필 갱신 때만 나가고 정기 수집(RSS)에는 관여하지 않는다.
     */
    private static final int MAX_HTML_BYTES = 3 * 1024 * 1024;
    private static final int MAX_FEED_BYTES = 2 * 1024 * 1024;
    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private static final Pattern CHANNEL_ID_IN_FEED_LINK =
            Pattern.compile("channel_id=(UC[A-Za-z0-9_-]{22})");
    private static final Pattern CHANNEL_ID_IN_EXTERNAL_ID =
            Pattern.compile("\"externalId\"\\s*:\\s*\"(UC[A-Za-z0-9_-]{22})\"");
    private static final Pattern CHANNEL_ID_IN_CANONICAL =
            Pattern.compile("/channel/(UC[A-Za-z0-9_-]{22})");
    /**
     * 핸들. 채널 페이지에는 {@code <link rel="canonical">} 이 없어(2026-08 실측) 내부 JSON 을 본다.
     * {@code canonicalBaseUrl} 이 {@code vanityChannelUrl} 보다 300KB 쯤 앞에 있어 먼저 본다.
     */
    private static final Pattern HANDLE_IN_CANONICAL_BASE =
            Pattern.compile("\"canonicalBaseUrl\"\\s*:\\s*\"/@([A-Za-z0-9._-]{3,30})\"");
    private static final Pattern HANDLE_IN_VANITY_URL =
            Pattern.compile("\"vanityChannelUrl\"\\s*:\\s*\"[^\"]*?/@([A-Za-z0-9._-]{3,30})\"");
    /** 채널 페이지의 og:image 는 채널 아바타다. 아바타 JSON 보다 300KB 쯤 앞에 있어 먼저 본다. */
    private static final Pattern AVATAR_IN_OG_IMAGE =
            Pattern.compile("<meta[^>]+property=\"og:image\"[^>]+content=\"([^\"]+)\"");
    private static final Pattern AVATAR_IN_HTML =
            Pattern.compile("\"avatar\"\\s*:\\s*\\{\"thumbnails\":\\[\\{\"url\":\"([^\"]+)\"");

    private final RestClient restClient;

    public YoutubeFeedClient(
            @Value("${youtube.feed.connect-timeout-ms:3000}") long connectTimeoutMs,
            @Value("${youtube.feed.read-timeout-ms:10000}") long readTimeoutMs) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                // 기본 User-Agent 로는 채널 HTML 이 축약된 형태로 오는 경우가 있다.
                .defaultHeader("User-Agent", "Mozilla/5.0 (compatible; CaskByCaskBot/1.0; +https://www.caskbycask.net)")
                .defaultHeader("Accept-Language", "ko-KR,ko;q=0.9,en;q=0.8")
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
     * 채널 페이지에서 채널 ID 와 프로필 이미지를 <b>한 번의 요청으로</b> 읽는다.
     * <p>
     * 페이지가 1MB 를 넘으므로 채널 ID 용·프로필용으로 두 번 받으면 등록 한 번에 2MB 를 끌어온다.
     * 둘 다 같은 문서에 있으니 한 번만 받는다.
     * <p>
     * [보안] 요청 주소는 식별자 조각으로 <b>우리가 조립</b>한다 — 관리자가 붙여 넣은 원문을 그대로
     * 요청하지 않으므로 임의 호스트로 나가지 않는다.
     *
     * @param handle     핸들(@ 제외). channelKey 가 없을 때 쓴다.
     * @param channelKey 채널 ID. 있으면 이쪽 주소를 쓴다.
     */
    public ChannelPageInfo fetchChannelPageInfo(String handle, String channelKey) {
        String url = channelKey != null
                ? UriComponentsBuilder.fromUriString(FEED_HOST)
                        .path("/channel/{channelKey}").buildAndExpand(channelKey).toUriString()
                : UriComponentsBuilder.fromUriString(FEED_HOST)
                        .path("/@{handle}").buildAndExpand(handle).toUriString();

        String html = getLimited(url, MAX_HTML_BYTES);
        if (html == null) {
            log.warn("유튜브 채널 페이지를 읽지 못했다: url={}", url);
            return new ChannelPageInfo(channelKey, handle, null);
        }
        return new ChannelPageInfo(
                channelKey != null ? channelKey : findFirst(html,
                        CHANNEL_ID_IN_FEED_LINK, CHANNEL_ID_IN_EXTERNAL_ID, CHANNEL_ID_IN_CANONICAL),
                // 채널 ID 로 등록한 채널은 핸들이 비어 있다. 페이지에서 찾아 채워 주면
                // 채널 페이지 주소가 사람이 읽는 형태(/youtube/channels/juryuhak)가 된다.
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

    /**
     * 프로필 이미지 URL. 찾지 못하면 null 이며, 그때는 관리자가 직접 넣는다
     * (프로필이 없어도 갤러리는 채널명 이니셜로 그린다).
     */
    private String findAvatar(String html) {
        Matcher og = AVATAR_IN_OG_IMAGE.matcher(html);
        if (og.find()) return unescapeJsonUrl(og.group(1));
        Matcher json = AVATAR_IN_HTML.matcher(html);
        // JSON 문자열 안이라 유니코드 이스케이프(& 등)가 섞여 있다.
        return json.find() ? unescapeJsonUrl(json.group(1)) : null;
    }

    /** 채널 피드 헤더에서 채널명을 읽는다. 등록 시 기본 채널명으로 쓴다. */
    public FeedChannel fetchChannelHeader(String channelKey) {
        Document document = getFeedDocument(channelFeedUrl(channelKey));
        if (document == null) return null;
        String title = firstChildText(document.getDocumentElement(), "title");
        return title == null ? null : new FeedChannel(channelKey, title);
    }

    /**
     * 채널의 최신 영상 목록(피드 상한 = 채널당 15편).
     * <p>
     * 롱폼·숏츠 갈래 피드를 먼저 시도해 유형까지 채우고, 둘 다 비면 채널 피드 하나로 떨어진다.
     * 두 갈래를 합칠 때는 <b>영상 ID 기준으로 중복을 제거</b>한다 — 두 플레이리스트에 같은 영상이
     * 들어오는 경우가 드물게 있다.
     */
    public List<FeedVideo> fetchLatestVideos(String channelKey) {
        Map<String, FeedVideo> merged = new LinkedHashMap<>();

        String suffix = channelKey.length() > 2 ? channelKey.substring(2) : null;
        if (suffix != null) {
            for (FeedVideo video : readFeed(playlistFeedUrl("UULF" + suffix), YoutubeVideoType.VIDEO)) {
                merged.putIfAbsent(video.videoKey(), video);
            }
            for (FeedVideo video : readFeed(playlistFeedUrl("UUSH" + suffix), YoutubeVideoType.SHORTS)) {
                merged.putIfAbsent(video.videoKey(), video);
            }
        }

        if (merged.isEmpty()) {
            log.info("유튜브 갈래 피드가 비어 채널 피드로 대체한다: channelKey={}", channelKey);
            for (FeedVideo video : readFeed(channelFeedUrl(channelKey), YoutubeVideoType.VIDEO)) {
                merged.putIfAbsent(video.videoKey(), video);
            }
        }
        return new ArrayList<>(merged.values());
    }

    /** 영상 한 편의 메타데이터. 관리자가 URL 로 직접 등록할 때 제목·썸네일을 채우는 데 쓴다. */
    public FeedVideo fetchSingleVideo(String videoKey, YoutubeVideoType videoType) {
        // oEmbed 는 API 키 없이 제목·채널명을 주는 유튜브 공식 엔드포인트다.
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

    /**
     * 영상이 아직 볼 수 있는 상태인지.
     * <p>
     * {@link #UNKNOWN} 은 <b>판단 보류</b>다 — 네트워크 오류나 예상 밖 응답에서 영상을 내리면
     * 멀쩡한 영상이 통째로 사라진다. 확실히 사라진 것만 내린다.
     */
    public enum VideoAvailability {
        /** 정상 — 공개되어 있고 임베드로 볼 수 있다. */
        AVAILABLE,
        /** 삭제되었거나 존재하지 않는다(404). */
        GONE,
        /** 비공개·연령제한·임베드 차단 등으로 우리 화면에서 볼 수 없다(401/403). */
        RESTRICTED,
        /** 확인 실패 — 상태를 바꾸지 않는다. */
        UNKNOWN
    }

    /**
     * oEmbed 로 영상 생사를 확인한다. API 키가 필요 없고 영상당 요청 한 번이다.
     * <p>
     * 채널 RSS 는 최신 15편만 담아 옛 영상이 지워졌는지 알려 주지 않는다. 그래서 이 경로가 따로 있다.
     */
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
                // 429(요청 과다)·5xx 는 유튜브 사정이지 영상 사정이 아니다.
                log.warn("유튜브 가용성 확인이 예상 밖 상태를 받았다: videoKey={}, status={}", videoKey, status);
                return VideoAvailability.UNKNOWN;
            });
        } catch (RuntimeException e) {
            log.warn("유튜브 가용성 확인 실패: videoKey={}, error={}", videoKey, e.toString());
            return VideoAvailability.UNKNOWN;
        }
    }

    /** oEmbed 응답에서 채널명을 읽는다 — 영상 직접 등록 시 어느 채널에 붙일지 안내하는 용도. */
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

    // ─── 내부 ────────────────────────────────────────────────

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

    private List<FeedVideo> readFeed(String url, YoutubeVideoType videoType) {
        Document document = getFeedDocument(url);
        if (document == null) return List.of();

        NodeList entries = document.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "entry");
        List<FeedVideo> videos = new ArrayList<>(entries.getLength());
        for (int i = 0; i < entries.getLength(); i++) {
            if (!(entries.item(i) instanceof Element entry)) continue;
            FeedVideo video = toFeedVideo(entry, videoType);
            if (video != null) videos.add(video);
        }
        return videos;
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

    private Document getFeedDocument(String url) {
        String xml = getLimited(url, MAX_FEED_BYTES);
        if (xml == null) return null;
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            // [보안] XXE 차단 — 외부에서 받은 XML 이다.
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            factory.setNamespaceAware(true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            return builder.parse(new InputSource(
                    new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8))));
        } catch (Exception e) {
            log.warn("유튜브 피드 XML 파싱 실패: url={}, error={}", url, e.toString());
            return null;
        }
    }

    /**
     * 본문을 상한까지만 읽는다. 실패는 null 로 돌려주고 호출 측이 채널 단위로 기록한다 —
     * 채널 하나가 막혔다고 전체 수집이 멈추면 안 된다.
     */
    private String getLimited(String url, int maxBytes) {
        try {
            return restClient.get()
                    .uri(url)
                    .exchange((request, response) -> {
                        if (response.getStatusCode().isError()) {
                            log.warn("유튜브 요청 실패: url={}, status={}", url, response.getStatusCode());
                            return null;
                        }
                        return readLimited(response.getBody(), maxBytes);
                    });
        } catch (RuntimeException e) {
            log.warn("유튜브 요청 예외: url={}, error={}", url, e.toString());
            return null;
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
}
