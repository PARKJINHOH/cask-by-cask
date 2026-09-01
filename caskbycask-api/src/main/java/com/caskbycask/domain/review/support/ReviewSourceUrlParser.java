package com.caskbycask.domain.review.support;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 사용자가 붙여 넣은 게시글 주소에서 <b>식별자만</b> 뽑아낸다.
 * <p>
 * [보안] 뽑아낸 조각은 항상 {@link com.caskbycask.domain.review.client.ReviewSourceClient} 가
 * <b>직접 조립한 주소</b>에만 쓴다. 붙여 넣은 문자열을 그대로 요청 URL 로 쓰면 사용자 입력이 곧
 * 서버의 외부 요청 대상이 되어 SSRF 통로가 된다. 그래서 이 클래스는 URL 을 돌려주지 않는다 —
 * 유튜브 수집(`YoutubeUrlParser`)과 같은 규칙이다.
 */
public final class ReviewSourceUrlParser {

    /** 지원 사이트 — 비로그인으로 열리는 공개 게시판만 넣는다. */
    public enum SourceSite {
        DCINSIDE,
        ARCALIVE,
    }

    /**
     * 디시인사이드 게시판 갈래. 경로 접두사는 <b>고정 집합</b>이라 사용자가 정할 수 없다.
     * 갤러리 종류마다 접두사가 달라 하나로 합칠 수 없다.
     */
    public enum DcBoardKind {
        MAIN("board"),
        MINOR("mgallery/board"),
        MINI("mini/board"),
        PERSON("person/board");

        private final String pathPrefix;

        DcBoardKind(String pathPrefix) {
            this.pathPrefix = pathPrefix;
        }

        public String pathPrefix() {
            return pathPrefix;
        }
    }

    /** 해석 결과. 어느 것도 원문 URL 을 담지 않는다. */
    public record SourceReference(SourceSite site, DcBoardKind boardKind, String boardId, String postNo) {
    }

    private static final Map<String, SourceSite> HOSTS = Map.of(
            "gall.dcinside.com", SourceSite.DCINSIDE,
            "m.dcinside.com", SourceSite.DCINSIDE,
            "arca.live", SourceSite.ARCALIVE,
            "www.arca.live", SourceSite.ARCALIVE
    );

    private static final Pattern DC_BOARD_ID = Pattern.compile("^[A-Za-z0-9_]{1,50}$");
    private static final Pattern POST_NO = Pattern.compile("^[0-9]{1,12}$");
    private static final Pattern ARCA_ARTICLE = Pattern.compile("^/b/([a-z0-9_-]{1,30})/([0-9]{1,12})");

    private ReviewSourceUrlParser() {
    }

    /**
     * 게시글 주소를 식별자로 해석한다. 지원하지 않는 주소면 null.
     * <p>
     * 스킴은 http(s) 만 받는다. {@code javascript:}·{@code file:} 같은 스킴이나 사용자 정보가 붙은
     * 주소({@code user@host})는 여기서 걸러 낸다.
     */
    public static SourceReference parse(String raw) {
        if (raw == null || raw.isBlank()) return null;

        URI uri;
        try {
            uri = new URI(raw.trim());
        } catch (URISyntaxException e) {
            return null;
        }

        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
            return null;
        }
        if (uri.getUserInfo() != null) return null;

        String host = uri.getHost();
        if (host == null) return null;
        SourceSite site = HOSTS.get(host.toLowerCase(Locale.ROOT));
        if (site == null) return null;

        String path = uri.getPath() == null ? "" : uri.getPath();
        return switch (site) {
            case DCINSIDE -> parseDcinside(path, uri.getQuery());
            case ARCALIVE -> parseArcalive(path);
        };
    }

    /**
     * 디시는 갤러리 갈래가 경로에, 갤러리 ID 와 글 번호가 쿼리에 있다.
     * 예: {@code /mgallery/board/view/?id=whiskey&no=1771938}
     */
    private static SourceReference parseDcinside(String path, String query) {
        DcBoardKind kind = dcBoardKind(path);
        if (kind == null || query == null) return null;

        String boardId = queryValue(query, "id");
        String postNo = queryValue(query, "no");
        if (boardId == null || postNo == null) return null;
        if (!DC_BOARD_ID.matcher(boardId).matches()) return null;
        if (!POST_NO.matcher(postNo).matches()) return null;

        return new SourceReference(SourceSite.DCINSIDE, kind, boardId, postNo);
    }

    private static DcBoardKind dcBoardKind(String path) {
        if (!path.contains("/view")) return null;
        if (path.startsWith("/mgallery/board/")) return DcBoardKind.MINOR;
        if (path.startsWith("/mini/board/")) return DcBoardKind.MINI;
        if (path.startsWith("/person/board/")) return DcBoardKind.PERSON;
        if (path.startsWith("/board/")) return DcBoardKind.MAIN;
        return null;
    }

    /** 아카라이브는 채널 슬러그와 글 번호가 경로에 있다. 예: {@code /b/alcohol/180878131} */
    private static SourceReference parseArcalive(String path) {
        Matcher matcher = ARCA_ARTICLE.matcher(path);
        if (!matcher.find()) return null;
        return new SourceReference(SourceSite.ARCALIVE, null, matcher.group(1), matcher.group(2));
    }

    /**
     * 쿼리에서 값 하나를 꺼낸다.
     * <p>
     * {@code UriComponentsBuilder} 를 쓰지 않는 이유는, 여기서 필요한 것이 "정확히 이 이름의
     * 파라미터 값"뿐이고 나머지 쿼리는 전부 버려야 하기 때문이다. 파싱 결과를 다시 조립하면
     * 사용자가 넣은 다른 파라미터가 요청에 섞여 들어갈 여지가 생긴다.
     */
    private static String queryValue(String query, String name) {
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq <= 0) continue;
            if (!pair.substring(0, eq).equals(name)) continue;
            String value = pair.substring(eq + 1);
            return value.isEmpty() ? null : value;
        }
        return null;
    }
}
