package com.caskbycask.domain.venue.client;

import com.caskbycask.domain.venue.support.MapShareUrlParser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * 단축 지도 링크를 긴 URL 로 펼친다.
 *
 * <h3>SSRF 경계</h3>
 * 리뷰 출처 파서가 세운 규칙을 문자 그대로 따른다 —
 * <b>사용자가 붙여넣은 문자열을 요청 대상으로 삼지 않는다.</b>
 * <ul>
 *   <li>파서가 형식이 검증된 <b>짧은 코드</b>만 돌려주고, URL 은 상수 호스트에서 조립된다</li>
 *   <li>리다이렉트를 따라가지 않는다({@code NEVER}) — {@code Location} 헤더만 읽는다.
 *       본문을 받지 않으므로 응답 크기·내용 리스크가 없다</li>
 *   <li>최대 2 홉, 매 홉마다 호스트 허용목록을 다시 확인한다</li>
 * </ul>
 *
 * <h3>기본값이 꺼져 있는 이유</h3>
 * 구글 약관은 Places API 외의 자동 접근을 권장하지 않는다. 관리자가 버튼을 눌러 한 번 조회하는
 * 것은 위험이 낮지만 <b>허가된 행위는 아니다</b> — 켜는 것은 운영자의 명시적 결정이어야 한다.
 */
@Slf4j
@Component
public class MapShareLinkExpander {

    private static final int MAX_HOPS = 2;

    /** 매 홉에서 확인한다. 리다이렉트가 다른 곳으로 튀면 즉시 멈춘다. */
    private static final Set<String> ALLOWED_HOSTS = Set.of(
            "maps.app.goo.gl", "goo.gl",
            "www.google.com", "google.com", "maps.google.com",
            "naver.me", "map.naver.com", "m.map.naver.com", "m.place.naver.com",
            "kko.kakao.com", "map.kakao.com", "m.map.kakao.com", "place.map.kakao.com"
    );

    private final boolean enabled;
    private final HttpClient httpClient;

    public MapShareLinkExpander(
            @Value("${venue.link-resolver.enabled:false}") boolean enabled,
            @Value("${venue.link-resolver.connect-timeout-ms:3000}") long connectTimeoutMs) {
        this.enabled = enabled;
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .build();
    }

    public boolean isEnabled() {
        return enabled;
    }

    /**
     * 단축 링크를 펼친다. 실패는 전부 {@link Optional#empty()} 다 —
     * 예외를 밖으로 던지면 관리자 폼이 통째로 실패하는데, 여기 실패는 정상 흐름이다
     * (수동 핀 드롭으로 이어진다).
     */
    public Optional<String> expand(MapShareUrlParser.ShortLink shortLink) {
        if (!enabled || shortLink == null) return Optional.empty();

        String current = shortLink.toAbsoluteUrl();
        for (int hop = 0; hop < MAX_HOPS; hop++) {
            Optional<String> next = followOnce(current);
            if (next.isEmpty()) return hop == 0 ? Optional.empty() : Optional.of(current);
            current = next.get();
            if (!isAllowed(current)) {
                log.warn("[MapShareLinkExpander] 허용되지 않은 호스트로 리다이렉트되어 중단합니다.");
                return Optional.empty();
            }
        }
        return Optional.of(current);
    }

    private Optional<String> followOnce(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(5))
                    // 봇 차단을 우회하려는 것이 아니라, 우리를 식별시키기 위한 값이다.
                    .header("User-Agent", "CaskByCask/1.0 (+https://www.caskbycask.net)")
                    .method("HEAD", HttpRequest.BodyPublishers.noBody())
                    .build();
            // 본문을 버린다 — Location 헤더만 필요하다.
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() / 100 != 3) return Optional.empty();
            return response.headers().firstValue("location");
        } catch (Exception exception) {
            log.debug("[MapShareLinkExpander] 확장 실패: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    private boolean isAllowed(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            return host != null && ALLOWED_HOSTS.contains(host.toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
