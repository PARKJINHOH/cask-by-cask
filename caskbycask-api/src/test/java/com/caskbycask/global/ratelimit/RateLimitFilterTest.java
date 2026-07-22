package com.caskbycask.global.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    @Test
    void directLoopbackGetIsInternalRead() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/seo/spirits/295");
        request.setRemoteAddr("127.0.0.1");

        assertThat(RateLimitFilter.isDirectLoopbackRead(request)).isTrue();
    }

    @Test
    void proxiedLoopbackGetKeepsRateLimit() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/spirits/295");
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Real-IP", "203.0.113.10");

        assertThat(RateLimitFilter.isDirectLoopbackRead(request)).isFalse();
    }

    @Test
    void directLoopbackWriteKeepsRateLimit() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/posts");
        request.setRemoteAddr("127.0.0.1");

        assertThat(RateLimitFilter.isDirectLoopbackRead(request)).isFalse();
    }
}
