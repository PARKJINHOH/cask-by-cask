package com.caskbycask.domain.review.client;

import com.caskbycask.domain.review.support.ReviewSourceUrlParser.SourceReference;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Set;

/**
 * 공개 게시글 본문을 텍스트로만 읽어 온다. 아무것도 저장하지 않는다.
 * <p>
 * [보안] 요청 주소는 {@link com.caskbycask.domain.review.support.ReviewSourceUrlParser} 가 뽑아 준
 * 식별자로 <b>여기서 직접 조립</b>한다. 사용자가 넣은 문자열은 요청 대상이 되지 않는다.
 * <p>
 * 이미지는 수집하지 않는다 — 가져오는 것은 사용자가 직접 쓴 리뷰 텍스트뿐이다.
 */
@Slf4j
@Component
public class ReviewSourceClient {

    private static final String DCINSIDE_HOST = "https://gall.dcinside.com";
    private static final String ARCALIVE_HOST = "https://arca.live";

    /** 게시글 HTML 읽기 상한. 본문만 필요하므로 유튜브 채널 페이지처럼 크게 잡을 이유가 없다. */
    private static final int MAX_HTML_BYTES = 1024 * 1024;
    /** 리뷰 노트 네 칸(각 600자)에 담길 분량이면 충분하다. */
    private static final int MAX_CONTENT_CHARS = 4000;
    private static final int MAX_TITLE_CHARS = 200;

    private final RestClient restClient;

    public ReviewSourceClient(
            @Value("${review-import.connect-timeout-ms:3000}") long connectTimeoutMs,
            @Value("${review-import.read-timeout-ms:5000}") long readTimeoutMs) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader("User-Agent",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                                + "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
                .defaultHeader("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .defaultHeader("Accept-Language", "ko-KR,ko;q=0.9,en;q=0.8")
                .build();
    }

    /** 게시글에서 읽어 낸 것. 파싱은 프론트가 하므로 여기서는 제목과 본문만 넘긴다. */
    public record SourcePost(String title, String content, String canonicalUrl) {
    }

    /** 읽지 못했으면 null. 호출부가 사용자에게 "본문을 붙여넣어 주세요"로 안내한다. */
    public SourcePost fetch(SourceReference reference) {
        String url = buildUrl(reference);
        String html = getLimited(url);
        if (html == null || html.isBlank()) return null;

        Document document = Jsoup.parse(html, url);
        return switch (reference.site()) {
            case DCINSIDE -> extract(document, ".title_subject", ".write_div", url);
            case ARCALIVE -> extract(document, ".title, .article-head .title", ".article-content", url);
        };
    }

    /**
     * 식별자로 요청 주소를 조립한다.
     * <p>
     * 경로 접두사는 enum 이 가진 고정 값이고 갤러리 ID·글 번호는 파서가 정규식으로 검증한 뒤라
     * 여기서 문자열을 이어 붙여도 사용자가 호스트나 경로를 바꿀 수 없다.
     */
    private String buildUrl(SourceReference reference) {
        return switch (reference.site()) {
            case DCINSIDE -> "%s/%s/view/?id=%s&no=%s".formatted(
                    DCINSIDE_HOST, reference.boardKind().pathPrefix(),
                    reference.boardId(), reference.postNo());
            case ARCALIVE -> "%s/b/%s/%s".formatted(
                    ARCALIVE_HOST, reference.boardId(), reference.postNo());
        };
    }

    private SourcePost extract(Document document, String titleQuery, String bodyQuery, String url) {
        Element body = document.selectFirst(bodyQuery);
        if (body == null) {
            log.warn("리뷰 원문 본문을 찾지 못함: url={}, selector={}", url, bodyQuery);
            return null;
        }

        String content = toPlainText(body);
        if (content.isBlank()) return null;
        if (content.length() > MAX_CONTENT_CHARS) content = content.substring(0, MAX_CONTENT_CHARS);

        Element titleNode = document.selectFirst(titleQuery);
        String title = titleNode == null ? "" : titleNode.text().trim();
        if (title.length() > MAX_TITLE_CHARS) title = title.substring(0, MAX_TITLE_CHARS);

        return new SourcePost(title, content, url);
    }

    /** 줄바꿈을 만들어야 하는 블록 태그. */
    private static final Set<String> BLOCK_TAGS =
            Set.of("p", "div", "li", "tr", "blockquote", "h1", "h2", "h3", "h4");

    /**
     * 본문 조각을 <b>줄 구조를 살린</b> 평문으로 바꾼다.
     *
     * <p>줄바꿈이 곧 파싱의 근거다 — 프론트의 규칙 파서는 라벨(`N:`·`총평`)을 <b>줄머리에서만</b>
     * 찾는다. jsoup 의 {@code text()} 는 공백을 전부 하나로 접어 버려 그대로 뽑으면 본문이
     * 한 줄이 되고, 그러면 라벨이 하나도 잡히지 않는다.
     *
     * <p>예전에는 {@code <br>} 자리에 표식 문자열을 <b>HTML 로 끼워 넣었다가</b> 되돌렸다.
     * 그런데 HTML 파서가 표식을 그대로 두지 않는다 — 제어문자는 U+FFFD 로 바뀌고 공백은
     * 접힌다. 되돌리기가 실패하면서 표식이 본문에 글자로 남고 줄바꿈은 통째로 사라졌다.
     * 그래서 문서에 아무것도 끼워 넣지 않고 노드를 직접 훑어 텍스트를 모은다.
     */
    static String toPlainText(Element body) {
        StringBuilder out = new StringBuilder();
        appendText(body, out);
        return out.toString()
                .replace('\u00a0', ' ')
                .replaceAll("[ \\t]+", " ")
                .replaceAll(" *\n *", "\n")
                .replaceAll("\n{3,}", "\n\n")
                .trim();
    }

    private static void appendText(Node node, StringBuilder out) {
        String name = node.nodeName();
        if (node instanceof TextNode text) {
            out.append(text.getWholeText());
            return;
        }
        if ("script".equals(name) || "style".equals(name)) return;
        if ("br".equals(name)) {
            out.append('\n');
            return;
        }
        for (Node child : node.childNodes()) appendText(child, out);
        if (BLOCK_TAGS.contains(name)) out.append('\n');
    }

    private String getLimited(String url) {
        try {
            return restClient.get()
                    .uri(url)
                    .exchange((request, response) -> {
                        if (response.getStatusCode().isError()) {
                            log.warn("리뷰 원문 요청 실패: url={}, status={}", url, response.getStatusCode().value());
                            return null;
                        }
                        return readLimited(response.getBody());
                    });
        } catch (RuntimeException e) {
            // 원문 사이트가 차단하거나 형식을 바꾸면 여기로 온다. 붙여넣기가 원래의 주 경로다.
            log.warn("리뷰 원문 요청 예외: url={}, error={}", url, e.toString());
            return null;
        }
    }

    private String readLimited(InputStream input) throws IOException {
        if (input == null) return null;
        byte[] buffer = new byte[8192];
        byte[] result = new byte[64 * 1024];
        int total = 0;
        int read;
        while (total < MAX_HTML_BYTES && (read = input.read(buffer)) != -1) {
            int copy = Math.min(read, MAX_HTML_BYTES - total);
            if (total + copy > result.length) {
                byte[] grown = new byte[Math.min(MAX_HTML_BYTES, Math.max(result.length * 2, total + copy))];
                System.arraycopy(result, 0, grown, 0, total);
                result = grown;
            }
            System.arraycopy(buffer, 0, result, total, copy);
            total += copy;
        }
        return new String(result, 0, total, StandardCharsets.UTF_8);
    }
}
