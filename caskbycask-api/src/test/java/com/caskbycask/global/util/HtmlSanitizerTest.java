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
}
