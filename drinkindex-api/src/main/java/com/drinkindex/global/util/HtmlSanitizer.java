package com.drinkindex.global.util;

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
//   허용 예외: p/h1~h4의 style (text-align 전용), img의 상대경로 src (로컬 스토리지).
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

    private static Safelist buildNoticeSafelist() {
        return new Safelist()
                // 텍스트 서식
                .addTags("p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote")
                // 제목
                .addTags("h1", "h2", "h3", "h4")
                // 글자 색상: TipTap TextStyle/Color 확장이 <span style="color:..."> 를 삽입함.
                .addTags("span")
                .addAttributes("span", "style")
                // 글자 배경색: TipTap Highlight 확장이 <mark style="background-color:..." data-color="..."> 를 삽입함.
                .addTags("mark")
                .addAttributes("mark", "style", "data-color")
                // 텍스트 정렬: TipTap TextAlign 확장이 style="text-align:..." 을 삽입함.
                // style은 jsoup이 CSS 값을 검증하지 않지만, 클라이언트 DOMPurify가 2차로 정제.
                .addAttributes("p", "style")
                .addAttributes("h1", "style")
                .addAttributes("h2", "style")
                .addAttributes("h3", "style")
                .addAttributes("h4", "style")
                // 목록
                .addTags("ul", "ol", "li")
                // 링크: addProtocols에 javascript: 미포함 → href javascript: 프로토콜 명시적 차단
                .addTags("a")
                .addAttributes("a", "href", "target", "rel")
                .addProtocols("a", "href", "http", "https", "mailto")
                // target="_blank" 여부와 무관하게 rel="noopener noreferrer" 강제 추가 (탭 하이재킹 방지)
                .addEnforcedAttribute("a", "rel", "noopener noreferrer")
                // 이미지: 업로드 엔드포인트 전용. 로컬 프로파일에서 /api/notices/images/... 형태의
                // 상대 경로 URL을 사용하므로 프로토콜 제한을 두지 않음.
                // data: URI 악용은 업로드 시 Magic Bytes 검증 + 클라이언트 DOMPurify로 방어.
                .addTags("img")
                .addAttributes("img", "src", "alt", "width", "height", "style")
                // 테이블
                .addTags("table", "thead", "tbody", "tr", "th", "td")
                .addAttributes("th", "scope", "colspan", "rowspan")
                .addAttributes("td", "colspan", "rowspan")
                // 영상 임베드(YouTube/Vimeo): TipTap VideoEmbed 노드가
                //   <div data-video-embed><iframe src="..."></iframe></div> 를 삽입함.
                //   iframe src 는 sanitize() 후처리에서 영상 플랫폼 호스트만 허용(그 외 제거).
                .addTags("div", "iframe")
                .addAttributes("div", "data-video-embed", "class")
                .addAttributes("iframe", "src", "class", "allow", "allowfullscreen", "frameborder")
                .addProtocols("iframe", "src", "http", "https");
    }

    // [보안] 법적 문서(약관·개인정보처리방침)용 Safelist.
    //   관리자만 등록 가능한 콘텐츠이므로 구조적 태그(div, article, section)와
    //   class 속성(Tailwind CSS 클래스)을 허용.
    //   on* 이벤트 속성, script, iframe, javascript: 프로토콜은 차단.
    private static Safelist buildLegalSafelist() {
        return new Safelist()
                // 구조적 태그
                .addTags("div", "article", "section", "header", "footer", "main", "span")
                // 텍스트 서식
                .addTags("p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote")
                // 제목
                .addTags("h1", "h2", "h3", "h4", "h5", "h6")
                // 목록
                .addTags("ul", "ol", "li")
                // 링크
                .addTags("a")
                .addAttributes("a", "href", "target", "rel")
                .addProtocols("a", "href", "http", "https", "mailto")
                .addEnforcedAttribute("a", "rel", "noopener noreferrer")
                // 테이블
                .addTags("table", "thead", "tbody", "tfoot", "tr", "th", "td")
                .addAttributes("th", "scope", "colspan", "rowspan")
                .addAttributes("td", "colspan", "rowspan")
                // 이미지
                .addTags("img")
                .addAttributes("img", "src", "alt", "width", "height")
                // Tailwind class 속성 — 모든 허용 태그에 적용
                .addAttributes(":all", "class")
                // id 속성 (앵커 링크 목적 허용)
                .addAttributes(":all", "id")
                // 글자 색상: TipTap TextStyle/Color <span style="color:..."> + 정렬 style 허용
                .addAttributes("span", "style")
                .addAttributes("p", "style")
                .addAttributes("h1", "style")
                .addAttributes("h2", "style")
                .addAttributes("h3", "style")
                .addAttributes("h4", "style")
                // 글자 배경색: TipTap Highlight <mark style="background-color:..." data-color="...">
                .addTags("mark")
                .addAttributes("mark", "style", "data-color")
                // 영상 임베드(YouTube/Vimeo): <div data-video-embed><iframe src="..."></iframe></div>
                //   iframe src 는 sanitizeLegal() 후처리에서 영상 플랫폼 호스트만 허용(그 외 제거).
                .addTags("iframe")
                .addAttributes("div", "data-video-embed")
                .addAttributes("iframe", "src", "allow", "allowfullscreen", "frameborder")
                .addProtocols("iframe", "src", "http", "https");
    }

    /**
     * TipTap HTML을 화이트리스트 기반으로 Sanitize.
     */
    public String sanitize(String rawHtml) {
        if (rawHtml == null || rawHtml.isBlank()) {
            return "";
        }
        String cleaned = Jsoup.clean(rawHtml, NOTICE_SAFELIST);
        return stripUnsafeIframes(cleaned);
    }

    /**
     * [보안] 허용된 영상 플랫폼(YouTube/Vimeo) 외 호스트를 가진 iframe 을 제거.
     * jsoup Safelist 가 iframe 태그/src 프로토콜은 허용하지만 호스트 단위 검증은 못 하므로
     * API 직접 호출로 임의 iframe(src) 을 주입하는 공격을 여기서 차단한다.
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

    /**
     * 법적 문서(약관·개인정보처리방침) HTML Sanitize.
     * class 속성, div/article 등 구조 태그 허용.
     */
    public String sanitizeLegal(String rawHtml) {
        if (rawHtml == null || rawHtml.isBlank()) {
            return "";
        }
        String cleaned = Jsoup.clean(rawHtml, LEGAL_SAFELIST);
        return stripUnsafeIframes(cleaned);
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
