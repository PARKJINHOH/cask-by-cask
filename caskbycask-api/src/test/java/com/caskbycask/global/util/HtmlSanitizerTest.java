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
}
