package com.caskbycask.domain.venue.support;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 지도 공유 링크에서 좌표를 뽑는다. <b>순수 함수 — 네트워크를 쓰지 않는다.</b>
 *
 * <h3>무엇이 되고 무엇이 안 되는가</h3>
 * <ul>
 *   <li>구글 롱폼 {@code .../@35.68,139.76,17z/data=...!3d35.6812!4d139.7671} → 가능.
 *       {@code !3d!4d} 가 실제 핀이고 {@code @} 는 화면 중심이라 <b>앞의 것을 먼저</b> 본다.</li>
 *   <li>구글 단축 {@code maps.app.goo.gl/XXXX} → <b>불가</b>. 좌표가 들어 있지 않다.</li>
 *   <li>네이버 {@code ?c=127.02,37.49,15,...} → 가능. 경도가 먼저인 것에 주의.</li>
 *   <li>네이버 {@code /p/entry/place/123}, {@code naver.me/XXXX} → <b>불가</b>. place id 만 있다.</li>
 *   <li>카카오 {@code map.kakao.com/link/map/이름,37.40,127.10} → 가능.</li>
 *   <li>카카오 웹 공유 {@code ?itemId=...&urlX=...&urlY=...} → <b>불가</b>.
 *       {@code urlX/urlY} 는 위경도가 아니라 WCONGNAMUL 좌표계 값이라 역투영 없이는 쓸 수 없고,
 *       어림짐작으로 변환하면 <b>엉뚱한 자리에 핀이 꽂힌다</b> — 좌표 없음으로 두고 수동 핀으로 보낸다.</li>
 * </ul>
 *
 * <h3>보안</h3>
 * 이 클래스는 <b>식별자만</b> 뽑는다. 사용자가 붙여넣은 문자열이 그대로 요청 대상이 되지 않도록,
 * 확장이 필요한 짧은 코드는 {@link #shortCode} 로 형식을 강제해 돌려주고
 * 실제 URL 조립은 호출부가 상수 호스트로 한다(리뷰 출처 파서와 같은 규칙).
 */
public final class MapShareUrlParser {

    private MapShareUrlParser() {
    }

    /** 좌표 소수점 자리. DECIMAL(9,7)/(10,7) 보다 정밀한 값은 저장 시 어차피 잘린다. */
    private static final int SCALE = 7;

    /** 구글 데이터 파라미터의 실제 핀 좌표. 화면 중심(@)보다 정확하다. */
    private static final Pattern GOOGLE_PIN =
            Pattern.compile("!3d(-?\\d{1,3}\\.\\d+)!4d(-?\\d{1,3}\\.\\d+)");
    /** 구글 URL 의 화면 중심. 핀이 없을 때만 쓴다. */
    private static final Pattern GOOGLE_CENTER =
            Pattern.compile("@(-?\\d{1,3}\\.\\d+),(-?\\d{1,3}\\.\\d+)");
    /** 네이버 지도의 c 파라미터 — 경도,위도 순서다. */
    private static final Pattern NAVER_CENTER =
            Pattern.compile("[?&]c=(-?\\d{1,3}\\.\\d+),(-?\\d{1,3}\\.\\d+)");
    /** 애플 지도 / 일반 ll 파라미터 — 위도,경도 순서. */
    private static final Pattern LL_PARAM =
            Pattern.compile("[?&](?:ll|q|query|daddr|sll)=(-?\\d{1,3}\\.\\d+),\\s*(-?\\d{1,3}\\.\\d+)");
    /**
     * 카카오 지도 링크 API — {@code /link/map/이름,위도,경도}. 이름에도 쉼표가 들어갈 수 있어
     * 앞부분은 통째로 건너뛰고 <b>뒤의 숫자 두 개</b>만 읽는다({@code /link/roadview/위도,경도} 처럼
     * 이름이 없는 형태도 같은 식으로 걸린다).
     */
    private static final Pattern KAKAO_LINK = Pattern.compile(
            "/link/(?:map|to|roadview)/(?:[^/]*,)?(-?\\d{1,3}\\.\\d+),(-?\\d{1,3}\\.\\d+)");
    /** geo: URI. */
    private static final Pattern GEO_URI =
            Pattern.compile("^geo:(-?\\d{1,3}\\.\\d+),(-?\\d{1,3}\\.\\d+)");
    /** 좌표만 붙여넣은 경우 — 사람들이 실제로 이렇게 많이 준다. */
    private static final Pattern BARE_PAIR =
            Pattern.compile("^\\s*(-?\\d{1,2}\\.\\d+)\\s*,\\s*(-?\\d{1,3}\\.\\d+)\\s*$");

    /** 확장이 필요한 단축 링크의 코드 형식. 이 형식을 벗어나면 요청을 만들지 않는다. */
    private static final Pattern SHORT_CODE = Pattern.compile("^/([A-Za-z0-9_-]{4,32})/?$");

    private static final Pattern NAVER_PLACE_ID = Pattern.compile("/place/(\\d{4,20})");
    private static final Pattern GOOGLE_PLACE_ID = Pattern.compile("[?&]query_place_id=([A-Za-z0-9_-]{10,128})");

    /** 좌표 한 쌍. */
    public record Coordinates(BigDecimal lat, BigDecimal lng) {
    }

    /** 파싱 결과. 좌표가 없어도 place id 나 단축 코드는 건질 수 있다. */
    public record ParsedLink(
            Coordinates coordinates,
            String googlePlaceId,
            String naverPlaceId,
            ShortLink shortLink
    ) {
        public boolean hasCoordinates() {
            return coordinates != null;
        }
    }

    /** 확장해야 좌표를 얻을 수 있는 단축 링크. 호스트는 열거된 상수에서만 나온다. */
    public record ShortLink(Provider provider, String code) {
        public String toAbsoluteUrl() {
            return provider.baseUrl() + code;
        }
    }

    public enum Provider {
        GOOGLE("https://maps.app.goo.gl/"),
        NAVER("https://naver.me/"),
        KAKAO("https://kko.kakao.com/");

        private final String baseUrl;

        Provider(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String baseUrl() {
            return baseUrl;
        }
    }

    /**
     * 붙여넣은 문자열에서 뽑을 수 있는 것을 전부 뽑는다.
     *
     * <p>실패해도 예외를 던지지 않는다 — 관리자 화면에서는 "해석 실패"가 정상 흐름이고,
     * 그때는 지도에서 핀을 직접 찍으면 된다.
     */
    public static ParsedLink parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return new ParsedLink(null, null, null, null);
        }
        String input = raw.trim();
        String decoded = safeDecode(input);

        Coordinates coordinates = extractCoordinates(decoded);
        String googlePlaceId = firstGroup(GOOGLE_PLACE_ID, decoded);
        String naverPlaceId = null;
        ShortLink shortLink = null;

        URI uri = safeUri(input);
        if (uri != null && uri.getHost() != null) {
            String host = uri.getHost().toLowerCase(Locale.ROOT);
            if (host.endsWith("map.naver.com") || host.endsWith("place.naver.com")) {
                naverPlaceId = firstGroup(NAVER_PLACE_ID, decoded);
            }
            shortLink = shortCode(host, uri.getPath());
        }

        return new ParsedLink(coordinates, googlePlaceId, naverPlaceId, shortLink);
    }

    /**
     * 단축 링크 코드 추출.
     *
     * <p>여기서 형식을 강제하는 것이 SSRF 방어의 핵심이다 — 통과한 코드는 위 {@link Provider}
     * 의 <b>상수 호스트</b>에 이어 붙여 쓰이므로, 사용자가 준 호스트로 요청이 나갈 수 없다.
     */
    static ShortLink shortCode(String host, String path) {
        if (path == null) return null;
        Matcher matcher = SHORT_CODE.matcher(path);
        if (!matcher.matches()) return null;
        String code = matcher.group(1);

        if (host.equals("maps.app.goo.gl") || host.equals("goo.gl")) {
            return new ShortLink(Provider.GOOGLE, code);
        }
        if (host.equals("naver.me")) {
            return new ShortLink(Provider.NAVER, code);
        }
        if (host.equals("kko.kakao.com")) {
            return new ShortLink(Provider.KAKAO, code);
        }
        return null;
    }

    private static Coordinates extractCoordinates(String text) {
        // 구글 실제 핀이 가장 정확하다.
        Coordinates pin = match(GOOGLE_PIN, text, false);
        if (pin != null) return pin;

        Coordinates geo = match(GEO_URI, text, false);
        if (geo != null) return geo;

        // 네이버 c 파라미터는 경도가 먼저다.
        Coordinates naver = match(NAVER_CENTER, text, true);
        if (naver != null) return naver;

        // 카카오 링크 API — 경로에 박힌 좌표라 ll 계열 파라미터보다 먼저 본다.
        Coordinates kakao = match(KAKAO_LINK, text, false);
        if (kakao != null) return kakao;

        Coordinates ll = match(LL_PARAM, text, false);
        if (ll != null) return ll;

        Coordinates center = match(GOOGLE_CENTER, text, false);
        if (center != null) return center;

        return match(BARE_PAIR, text, false);
    }

    private static Coordinates match(Pattern pattern, String text, boolean lngFirst) {
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) return null;
        try {
            BigDecimal first = new BigDecimal(matcher.group(1));
            BigDecimal second = new BigDecimal(matcher.group(2));
            BigDecimal lat = lngFirst ? second : first;
            BigDecimal lng = lngFirst ? first : second;
            return isPlottable(lat, lng)
                    ? new Coordinates(scale(lat), scale(lng))
                    : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    /**
     * 0,0 을 유효한 좌표로 보지 않는다 — 기니만 앞바다에 바가 없어서가 아니라,
     * 파싱·지오코딩이 실패했을 때 흔히 남는 값이 0 이기 때문이다.
     */
    private static boolean isPlottable(BigDecimal lat, BigDecimal lng) {
        if (lat.signum() == 0 && lng.signum() == 0) return false;
        return lat.abs().compareTo(BigDecimal.valueOf(90)) <= 0
                && lng.abs().compareTo(BigDecimal.valueOf(180)) <= 0;
    }

    private static BigDecimal scale(BigDecimal value) {
        return value.setScale(SCALE, RoundingMode.HALF_UP).stripTrailingZeros();
    }

    private static String firstGroup(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1) : null;
    }

    private static String safeDecode(String value) {
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException exception) {
            return value;
        }
    }

    private static URI safeUri(String value) {
        try {
            URI uri = URI.create(value);
            return uri.isAbsolute() ? uri : null;
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}
