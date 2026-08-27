package com.caskbycask.global.util;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

// [보안] XSS 방어 핵심 클래스.
//   TipTap 에디터가 생성한 HTML을 서버에서 재검증.
//   프론트 DOMPurify만으로는 불충분 — API 직접 호출 시 우회 가능.
//   화이트리스트 방식: 허용 태그·속성 외 전부 제거.
//   차단 대상: script, iframe, object, embed, form, input, 모든 on* 이벤트 속성.
@Component
public class HtmlSanitizer {

    private static final Safelist NOTICE_SAFELIST = buildNoticeSafelist();
    private static final Safelist LEGAL_SAFELIST  = buildLegalSafelist();
    private static final Safelist REVIEW_COMMENT_SAFELIST = buildReviewCommentSafelist();

    // [보안] 리뷰 종합평가의 style 은 아래 선언만 남긴다. jsoup Safelist 는 속성 존재 여부만 보고
    //   CSS 내용을 검사하지 않아, position/display 같은 선언으로 주류 상세 화면을 덮을 수 있다.
    private static final List<String> ALLOWED_REVIEW_STYLE_PROPS = List.of(
            "color", "font-size", "background-color"
    );

    // [보안] iframe 임베드는 영상 플랫폼만 허용. jsoup Safelist는 호스트 단위 제한이 불가하므로
    //   Jsoup.clean 후 src 가 아래 prefix 로 시작하지 않는 iframe 은 후처리로 제거한다.
    private static final List<String> ALLOWED_IFRAME_SRC_PREFIXES = List.of(
            "https://www.youtube.com/embed/",
            "https://www.youtube-nocookie.com/embed/",
            "https://player.vimeo.com/video/"
    );

    /**
     * 공통 허용 규격 (사용자/관리자 에디터 공통 마크업)
     * 공통 기능(텍스트 포맷, 이미지, 테이블, 동영상 등) 변경 시 두 정책 모두 자동으로 반영되도록 함.
     */
    private static Safelist buildBaseSafelist() {
        return new Safelist()
                // 텍스트 서식
                .addTags("p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote", "hr")
                // 글자 색상: TipTap TextStyle/Color <span style="color:...">
                .addTags("span")
                .addAttributes("span", "style")
                // 글자 배경색: TipTap Highlight <mark style="background-color:..." data-color="...">
                .addTags("mark")
                .addAttributes("mark", "style", "data-color")
                // 텍스트 정렬: style="text-align:..." (기본적으로 p 태그에 정렬 적용)
                .addAttributes("p", "style")
                // 목록 + 체크리스트(TipTap TaskList)
                .addTags("ul", "ol", "li")
                .addAttributes("ul", "data-type")
                .addAttributes("ol", "start")
                .addAttributes("li", "data-type", "data-checked")
                // 링크: href javascript: 프로토콜 명시적 차단
                .addTags("a")
                .addAttributes("a", "href", "target", "rel")
                .addProtocols("a", "href", "http", "https", "mailto")
                .addEnforcedAttribute("a", "rel", "noopener noreferrer")
                // 본문 내 술 카드 임베드: TipTap SpiritEmbed 노드 데이터 보존
                .addAttributes("a", "class", "data-spirit-id", "data-spirit-name",
                        "data-spirit-name-en", "data-spirit-category",
                        "data-spirit-thumbnail", "data-spirit-abv", "data-spirit-review-count",
                        "data-spirit-width",
                        // 본문 내 내 리뷰 카드: 화면에 필요한 스냅샷만 보존
                        "data-review-id", "data-review-width",
                        "data-spirit-name-ko", "data-spirit-identifier-ko",
                        "data-spirit-identifier-en", "data-review-nose-score",
                        "data-review-taste-score", "data-review-finish-score",
                        "data-review-total-score", "data-review-nose-note",
                        "data-review-taste-note", "data-review-finish-note",
                        "data-review-comment")
                .addAttributes("span", "data-review-role", "data-review-section")
                // 이미지: 업로드 엔드포인트 전용 (style 및 크기 속성 허용)
                .addTags("img")
                .addAttributes("img", "src", "alt", "width", "height", "style",
                        "data-image-layout", "data-image-pair",
                        "data-image-pair-width", "data-image-pair-height", "data-image-source")
                // 테이블
                .addTags("table", "thead", "tbody", "tr", "th", "td")
                .addAttributes("th", "scope", "colspan", "rowspan")
                .addAttributes("td", "colspan", "rowspan")
                // 영상 임베드(YouTube/Vimeo)
                .addTags("div", "iframe")
                .addAttributes("div", "data-video-embed", "data-uploaded-video", "class")
                .addAttributes("iframe", "src", "class", "allow", "allowfullscreen", "frameborder")
                .addProtocols("iframe", "src", "http", "https")
                // 업로드 동영상
                .addTags("video")
                .addAttributes("video", "src", "controls", "type", "preload", "class");
    }

    /**
     * 일반 사용자(NoticeSafelist) 전용 확장 설정
     * - 보안을 위해 모든 태그에 대한 class/id 주입 차단
     * - h1~h4 제목만 제한적으로 지원
     */
    private static Safelist buildNoticeSafelist() {
        return buildBaseSafelist()
                .addTags("h1", "h2", "h3", "h4")
                .addAttributes("h1", "style")
                .addAttributes("h2", "style")
                .addAttributes("h3", "style")
                .addAttributes("h4", "style");
    }

    /**
     * 관리자/법적 문서(LegalSafelist) 전용 확장 설정
     * - 약관 및 관리자 페이지 레이아웃 유연성을 위해 모든 태그(:all)에 class/id 허용 (Tailwind 사용 지원)
     * - 구조적 태그(div, article, section 등) 및 추가 헤더 지원
     */
    private static Safelist buildLegalSafelist() {
        return buildBaseSafelist()
                .addTags("div", "article", "section", "header", "footer", "main")
                .addTags("h1", "h2", "h3", "h4", "h5", "h6")
                .addAttributes("h1", "style")
                .addAttributes("h2", "style")
                .addAttributes("h3", "style")
                .addAttributes("h4", "style")
                .addAttributes("h5", "style")
                .addAttributes("h6", "style")
                .addTags("tfoot")
                .addAttributes(":all", "class")
                .addAttributes(":all", "id");
    }

    /**
     * 리뷰 종합평가 전용 최소 허용 규격.
     *
     * <p>제한형 에디터(RichTextEditor variant="basic")가 만드는 서식만 남긴다 —
     * 굵기(strong/b), 밑줄(u), 글자색(span[style]), 형광펜(mark[style]), 글자 크기(span[style]).
     * 이미지·링크·목록·제목·표·임베드는 애초에 입력할 수 없으므로 허용하지 않는다.
     */
    private static Safelist buildReviewCommentSafelist() {
        return new Safelist()
                .addTags("p", "br", "strong", "b", "u", "span", "mark")
                .addAttributes("span", "style")
                .addAttributes("mark", "style", "data-color");
    }

    /**
     * 리뷰 종합평가 정제.
     *
     * <p>공지/커뮤니티와 달리 일반 사용자가 주류 상세 화면에 직접 쓰는 자리라
     * 허용 태그를 최소로 줄이고 style 선언까지 화이트리스트로 거른다.
     */
    public String sanitizeReviewComment(String rawHtml) {
        if (rawHtml == null || rawHtml.isBlank()) {
            return "";
        }
        // prettyPrint 를 끈다 — 기본값이면 jsoup 이 <br> 앞뒤로 줄바꿈과 들여쓰기를 넣는데,
        // 화면(.notice-content p)이 white-space: pre-wrap 이라 그게 그대로 공백으로 보인다.
        String cleaned = Jsoup.clean(
                rawHtml, "", REVIEW_COMMENT_SAFELIST,
                new Document.OutputSettings().prettyPrint(false));
        if (!cleaned.contains("style=")) {
            return cleaned;
        }
        Document doc = Jsoup.parseBodyFragment(cleaned);
        doc.outputSettings().prettyPrint(false);
        for (Element element : doc.select("[style]")) {
            String kept = Arrays.stream(element.attr("style").split(";"))
                    .map(String::trim)
                    .filter(declaration -> {
                        int colon = declaration.indexOf(':');
                        return colon > 0 && ALLOWED_REVIEW_STYLE_PROPS.contains(
                                declaration.substring(0, colon).trim().toLowerCase());
                    })
                    .collect(Collectors.joining("; "));
            if (kept.isEmpty()) element.removeAttr("style");
            else element.attr("style", kept);
        }
        return doc.body().html();
    }

    /**
     * TipTap HTML을 화이트리스트 기반으로 Sanitize (기본: 일반 사용자 수준)
     */
    public String sanitize(String rawHtml) {
        return sanitize(rawHtml, false);
    }

    /**
     * 문의 Editor 전용 정제. 첨부파일을 별도 채널로 관리하므로 본문 내 이미지·영상·카드 임베드는 제거한다.
     */
    public String sanitizeInquiry(String rawHtml) {
        String cleaned = sanitize(rawHtml, false);
        if (cleaned.isBlank()) return cleaned;

        Document doc = Jsoup.parseBodyFragment(cleaned);
        doc.outputSettings().prettyPrint(false);
        doc.select("img, iframe, video, a[data-spirit-id], a[data-review-id]").remove();
        return doc.body().html();
    }

    /**
     * 오버로딩 메소드: 역할을 식별하여 Sanitize
     * @param isAdminContext true 일 경우 관리자/법적 문서용 완화 정책(class/id 주입 허용) 사용
     */
    public String sanitize(String rawHtml, boolean isAdminContext) {
        if (rawHtml == null || rawHtml.isBlank()) {
            return "";
        }
        Safelist safelist = isAdminContext ? LEGAL_SAFELIST : NOTICE_SAFELIST;
        String cleaned = Jsoup.clean(rawHtml, safelist);
        cleaned = stripUnsafeIframes(cleaned);
        return stripUnsafeVideoSrc(cleaned);
    }

    /**
     * 기존 코드와의 하위 호환성을 위해 유지 (내부적으로 sanitize(rawHtml, true) 호출)
     */
    public String sanitizeLegal(String rawHtml) {
        return sanitize(rawHtml, true);
    }

    /**
     * [보안] 허용된 영상 플랫폼(YouTube/Vimeo) 외 호스트를 가진 iframe 을 제거.
     */
    private String stripUnsafeIframes(String html) {
        if (!html.contains("<iframe")) {
            return html;
        }
        Document doc = Jsoup.parseBodyFragment(html);
        doc.outputSettings().prettyPrint(false);
        for (Element iframe : doc.select("iframe")) {
            String src = iframe.attr("src");
            boolean allowed = ALLOWED_IFRAME_SRC_PREFIXES.stream().anyMatch(src::startsWith);
            if (!allowed) {
                iframe.remove();
            }
        }
        return doc.body().html();
    }

    // [보안] 업로드 동영상 src 가 /api/posts/videos/ 로 시작하지 않으면 제거.
    private String stripUnsafeVideoSrc(String html) {
        if (!html.contains("<video")) {
            return html;
        }
        Document doc = Jsoup.parseBodyFragment(html);
        doc.outputSettings().prettyPrint(false);
        for (Element video : doc.select("video")) {
            String src = video.attr("src");
            if (!src.startsWith("/api/posts/videos/")) {
                video.remove();
            }
        }
        return doc.body().html();
    }

    /**
     * 에디터 하단에 표시되는 글자수와 같은 기준으로 본문 길이를 센다.
     *
     * <p>TipTap CharacterCount 는 {@code doc.textBetween(0, size, undefined, " ")} 를 센다 —
     * 줄바꿈({@code <br>})은 한 칸으로 세고 문단 경계에는 아무것도 넣지 않는다.
     * {@link #sanitizeToPlainText}(jsoup {@code text()})는 문단 경계마다 공백을 넣어
     * 문단 수만큼 더 세므로, 길이 검증에 쓰면 화면에 600/600 이 뜬 글이 서버에서 반려된다.
     *
     * <p>프론트 {@code reviewRichText.reviewCommentLength} 와 같은 규칙을 유지한다.
     */
    public int countCharactersAsEditor(String html) {
        if (html == null || html.isBlank()) {
            return 0;
        }
        Document doc = Jsoup.parseBodyFragment(html);
        for (Element br : doc.select("br")) {
            br.replaceWith(new TextNode(" "));
        }
        // wholeText() 는 블록 경계에 구분자를 넣지 않고 텍스트 노드만 이어 붙인다.
        return doc.body().wholeText().length();
    }

    /**
     * 태그 전부 제거, 순수 텍스트 추출 (목록 미리보기용).
     */
    public String sanitizeToPlainText(String rawHtml) {
        if (rawHtml == null || rawHtml.isBlank()) {
            return "";
        }
        return Jsoup.parse(rawHtml).text();
    }
}
