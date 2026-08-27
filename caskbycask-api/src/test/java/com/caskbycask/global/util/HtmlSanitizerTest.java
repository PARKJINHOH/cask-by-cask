package com.caskbycask.global.util;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class HtmlSanitizerTest {

    private final HtmlSanitizer htmlSanitizer = new HtmlSanitizer();

    @Test
    void sanitize_preservesStartAttributeOnOrderedList() {
        String rawHtml = "<ol start=\"2\"><li><p>테스트2</p></li></ol>";
        String sanitized = htmlSanitizer.sanitize(rawHtml);
        assertThat(sanitized).contains("start=\"2\"");
    }

    @Test
    void sanitize_preservesSafeImagePairLayoutAttributes() {
        String rawHtml = "<img src=\"/api/posts/images/1\" data-image-layout=\"half-left\" "
                + "data-image-pair=\"pair-1\" data-image-pair-width=\"42\" "
                + "data-image-pair-height=\"0.36\"><img src=\"/api/posts/images/2\" "
                + "data-image-layout=\"half-right\" data-image-pair=\"pair-1\" "
                + "data-image-pair-width=\"42\" data-image-pair-height=\"0.36\">";

        String sanitized = htmlSanitizer.sanitize(rawHtml);

        assertThat(sanitized)
                .contains("data-image-layout=\"half-left\"")
                .contains("data-image-layout=\"half-right\"")
                .contains("data-image-pair=\"pair-1\"")
                .contains("data-image-pair-width=\"42\"")
                .contains("data-image-pair-height=\"0.36\"");
    }

    @Test
    void sanitize_preservesImageSourceAsPlainAttributeButRemovesExecutableMarkup() {
        String rawHtml = "<img src=\"/api/posts/images/1\" data-image-source=\"Magazine &amp; issue 7\" "
                + "onerror=\"alert(1)\"><script>alert(2)</script>";

        String sanitized = htmlSanitizer.sanitize(rawHtml);

        assertThat(sanitized)
                .contains("data-image-source=\"Magazine &amp; issue 7\"")
                .doesNotContain("onerror")
                .doesNotContain("script")
                .doesNotContain("alert");
    }

    @Test
    void sanitize_preservesSpiritCardWidth() {
        String rawHtml = "<a class=\"di-spirit-embed di-spirit-width-420\" "
                + "data-spirit-id=\"1\" data-spirit-name=\"긴 주류 이름\" "
                + "data-spirit-width=\"420\"><span>긴 주류 이름</span></a>";

        String sanitized = htmlSanitizer.sanitize(rawHtml);

        assertThat(sanitized)
                .contains("di-spirit-width-420")
                .contains("data-spirit-width=\"420\"");
    }

    @Test
    void sanitize_preservesReviewCardSnapshotAndStructure() {
        String rawHtml = "<a class=\"di-review-embed di-review-width-100\" "
                + "data-review-id=\"7\" data-review-width=\"100\" data-spirit-id=\"1\" "
                + "data-spirit-name-ko=\"테스트 위스키\" data-spirit-name-en=\"Test Whisky\" "
                + "data-spirit-identifier-ko=\"배치 1\" data-spirit-abv=\"46\" "
                + "data-spirit-review-count=\"12\" data-review-nose-score=\"4.0\" "
                + "data-review-nose-note=\"과일과 바닐라\" data-review-comment=\"균형이 좋다\">"
                + "<span data-review-role=\"sections\"><span data-review-section=\"nose\">"
                + "<span data-review-role=\"note\">과일과 바닐라</span></span></span></a>";

        String sanitized = htmlSanitizer.sanitize(rawHtml);

        assertThat(sanitized)
                .contains("di-review-embed")
                .contains("data-review-id=\"7\"")
                .contains("data-review-width=\"100\"")
                .contains("data-review-nose-note=\"과일과 바닐라\"")
                .contains("data-review-comment=\"균형이 좋다\"")
                .contains("data-review-role=\"sections\"")
                .contains("data-review-section=\"nose\"");
    }

    @Test
    void sanitizeReviewComment_keepsAllowedFormattingOnly() {
        // 제한형 에디터(TipTap Bold/Underline/Color/FontSize/Highlight)가 실제로 내보내는 모양.
        // Highlight 는 배경색과 함께 color: inherit 를 붙인다.
        String rawHtml = "<p><strong>깊은</strong> <u>여운</u>"
                + "<span style=\"color: rgb(185, 28, 28)\">붉게</span>"
                + "<mark data-color=\"#fef08a\" style=\"background-color: #fef08a; color: inherit\">강조</mark>"
                + "<span style=\"font-size: 18px\">크게</span></p>";

        String sanitized = htmlSanitizer.sanitizeReviewComment(rawHtml);

        assertThat(sanitized)
                .contains("<strong>깊은</strong>")
                .contains("<u>여운</u>")
                .contains("color: rgb(185, 28, 28)")
                .contains("font-size: 18px")
                .contains("background-color: #fef08a; color: inherit")
                .contains("data-color=\"#fef08a\"");
    }

    @Test
    void sanitizeReviewComment_dropsMarkupTheRestrictedEditorCannotProduce() {
        String rawHtml = "<h2>제목</h2><p>본문</p><ul><li>목록</li></ul>"
                + "<img src=\"/api/posts/images/1\">"
                + "<a href=\"https://example.com\">링크</a>"
                + "<iframe src=\"https://www.youtube.com/embed/test\"></iframe>"
                + "<script>alert(1)</script>";

        String sanitized = htmlSanitizer.sanitizeReviewComment(rawHtml);

        assertThat(sanitized)
                .contains("본문")
                .doesNotContain("<h2")
                .doesNotContain("<ul")
                .doesNotContain("<img")
                .doesNotContain("<a ")
                .doesNotContain("<iframe")
                .doesNotContain("<script");
    }

    @Test
    void sanitizeReviewComment_stripsStyleDeclarationsThatCouldCoverThePage() {
        // 리뷰는 일반 사용자가 주류 상세 화면에 직접 쓰는 자리라, 글자 꾸미기 외의
        // 선언(position/display 등)은 화면을 덮는 데 쓰일 수 있어 전부 걷어 낸다.
        String rawHtml = "<p><span style=\"position: fixed; top: 0; left: 0; width: 100vw; "
                + "height: 100vh; z-index: 9999; color: red\">덮기</span>"
                + "<span style=\"display: block; opacity: 0\">숨기기</span></p>";

        String sanitized = htmlSanitizer.sanitizeReviewComment(rawHtml);

        assertThat(sanitized)
                .contains("color: red")
                .doesNotContain("position")
                .doesNotContain("z-index")
                .doesNotContain("display")
                .doesNotContain("opacity");
    }

    @Test
    void countCharactersAsEditor_matchesTheCounterShownUnderTheEditor() {
        // 프론트 reviewRichText.reviewCommentLength / TipTap CharacterCount 와 같은 기준이다.
        // 문단 경계는 세지 않고 <br> 만 한 칸으로 센다.
        assertThat(htmlSanitizer.countCharactersAsEditor("<p>한<br>두</p><p>셋</p>")).isEqualTo(4);
        assertThat(htmlSanitizer.countCharactersAsEditor("<p>가나다</p>")).isEqualTo(3);
        assertThat(htmlSanitizer.countCharactersAsEditor(
                "<p><strong>가</strong><span style=\"color:red\">나</span></p><p>다</p><p>라</p>"))
                .isEqualTo(4);
        assertThat(htmlSanitizer.countCharactersAsEditor("<p>끝 공백 </p><p> 앞 공백</p>")).isEqualTo(10);
        assertThat(htmlSanitizer.countCharactersAsEditor("<p>&amp;lt;</p>")).isEqualTo(4);
        assertThat(htmlSanitizer.countCharactersAsEditor("<p></p>")).isZero();
        assertThat(htmlSanitizer.countCharactersAsEditor(null)).isZero();
    }

    @Test
    void countCharactersAsEditor_doesNotAddASpacePerParagraphLikePlainTextExtraction() {
        String html = "<p>가</p><p>나</p><p>다</p>";

        // jsoup text() 는 문단마다 공백을 넣어 5 를 돌려준다. 그대로 길이 검증에 쓰면
        // 에디터에 3 자로 표시되는 글이 서버에서는 5 자로 세어져, 화면 글자수와 반려 사유가 어긋난다.
        assertThat(htmlSanitizer.sanitizeToPlainText(html)).hasSize(5);
        assertThat(htmlSanitizer.countCharactersAsEditor(html)).isEqualTo(3);
    }

    @Test
    void sanitizeInquiry_preservesFormattingButRemovesEmbeddedMedia() {
        String rawHtml = "<h3>문의</h3><p><strong>내용</strong></p>"
                + "<img src=\"/api/posts/images/1\">"
                + "<iframe src=\"https://www.youtube.com/embed/test\"></iframe>"
                + "<a data-spirit-id=\"1\" href=\"/spirits/1\">술 카드</a>";

        String sanitized = htmlSanitizer.sanitizeInquiry(rawHtml);

        assertThat(sanitized)
                .contains("<h3>문의</h3>")
                .contains("<strong>내용</strong>")
                .doesNotContain("<img")
                .doesNotContain("<iframe")
                .doesNotContain("data-spirit-id");
    }
}
