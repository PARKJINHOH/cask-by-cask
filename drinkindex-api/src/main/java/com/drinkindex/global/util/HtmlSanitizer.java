package com.drinkindex.global.util;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

// [보안] XSS 방어 핵심 클래스.
//   TipTap 에디터가 생성한 HTML을 서버에서 재검증.
//   프론트 DOMPurify만으로는 불충분 — API 직접 호출 시 우회 가능.
//   화이트리스트 방식: 허용 태그·속성 외 전부 제거.
//   차단 대상: script, iframe, object, embed, form, input, 모든 on* 이벤트 속성.
//   허용 예외: p/h1~h4의 style (text-align 전용), img의 상대경로 src (로컬 스토리지).
@Component
public class HtmlSanitizer {

    private static final Safelist NOTICE_SAFELIST = buildNoticeSafelist();

    private static Safelist buildNoticeSafelist() {
        return new Safelist()
                // 텍스트 서식
                .addTags("p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote")
                // 제목
                .addTags("h1", "h2", "h3", "h4")
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
                .addAttributes("td", "colspan", "rowspan");
    }

    /**
     * TipTap HTML을 화이트리스트 기반으로 Sanitize.
     */
    public String sanitize(String rawHtml) {
        if (rawHtml == null || rawHtml.isBlank()) {
            return "";
        }
        return Jsoup.clean(rawHtml, NOTICE_SAFELIST);
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
