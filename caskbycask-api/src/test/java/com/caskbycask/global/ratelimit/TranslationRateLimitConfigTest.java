package com.caskbycask.global.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class TranslationRateLimitConfigTest {

    @Test
    void translationRulePrecedesDefaultAndAllowsTenRequestsPerMinute() {
        var rules = new RateLimitConfig().rateLimitRules();
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/translations");

        RateLimitRule firstMatch = rules.stream()
                .filter(rule -> rule.matcher().matches(request))
                .findFirst()
                .orElseThrow();

        assertThat(firstMatch.name()).isEqualTo("public-content-translation");
        assertThat(firstMatch.capacity()).isEqualTo(10);
        assertThat(firstMatch.keyType()).isEqualTo(RateLimitRule.KeyType.IP_OR_USER);
    }
}
