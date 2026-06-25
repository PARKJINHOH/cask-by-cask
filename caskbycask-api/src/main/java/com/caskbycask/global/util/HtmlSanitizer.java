package com.caskbycask.global.util;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

import java.util.List;

// [보안] XSS 방어 핵심 클래스.
//   TipTap 에디터가 생성한 HTML을 서버에서 재검증.
//   프론트 DOMPurify만으로는 불충분 — API 직접 호출 시 우회 가능.
//   화이트리스트 방식: 허용 태그·속성 외 전부 제거.
//   차단 대상: script, iframe, object, embed, form, input, 모든 on* 이벤트 속성.
@Component
public class HtmlSanitizer {

    private static final Safelist NOTICE_SAFELIST = buildNoticeSafelist();
    private static final Safelist LEGAL_SAFELIST  = buildLegalSafelist();

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
                .addAttributes("li", "data-type", "data-checked")
                // 링크: href javascript: 프로토콜 명시적 차단
                .addTags("a")
                .addAttributes("a", "href", "target", "rel")
                .addProtocols("a", "href", "http", "https", "mailto")
                .addEnforcedAttribute("a", "rel", "noopener noreferrer")
                // 본문 내 술 카드 임베드: TipTap SpiritEmbed 노드 데이터 보존
                .addAttributes("a", "class", "data-spirit-id", "data-spirit-name",
                        "data-spirit-name-en", "data-spirit-category",
                        "data-spirit-thumbnail", "data-spirit-abv", "data-spirit-review-count")
                // 이미지: 업로드 엔드포인트 전용 (style 및 크기 속성 허용)
                .addTags("img")
                .addAttributes("img", "src", "alt", "width", "height", "style")
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
     * TipTap HTML을 화이트리스트 기반으로 Sanitize (기본: 일반 사용자 수준)
     */
    public String sanitize(String rawHtml) {
        return sanitize(rawHtml, false);
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
     * 태그 전부 제거, 순수 텍스트 추출 (목록 미리보기용).
     */
    public String sanitizeToPlainText(String rawHtml) {
        if (rawHtml == null || rawHtml.isBlank()) {
            return "";
        }
        return Jsoup.parse(rawHtml).text();
    }
}
