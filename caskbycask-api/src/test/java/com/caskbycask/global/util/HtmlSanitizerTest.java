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
    void sanitize_preservesSpiritCardWidth() {
        String rawHtml = "<a class=\"di-spirit-embed di-spirit-width-420\" "
                + "data-spirit-id=\"1\" data-spirit-name=\"긴 주류 이름\" "
                + "data-spirit-width=\"420\"><span>긴 주류 이름</span></a>";

        String sanitized = htmlSanitizer.sanitize(rawHtml);

        assertThat(sanitized)
                .contains("di-spirit-width-420")
                .contains("data-spirit-width=\"420\"");
    }
}
