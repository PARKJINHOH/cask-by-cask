package com.caskbycask.domain.seo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class IndexNowServiceTest {

    @Test
    @DisplayName("IndexNow 키 파일은 명시적으로 활성화되고 유효한 키가 있을 때만 공개된다")
    void key_file_requires_enabled_and_valid_configuration() {
        IndexNowService service = new IndexNowService(new ObjectMapper());
        configure(service, true, "not-a-hex-key!");
        assertThat(service.isKeyFileAvailable()).isFalse();

        configure(service, false, "abcdef12-3456");
        assertThat(service.isKeyFileAvailable()).isFalse();

        configure(service, true, "abcdef12-3456");
        assertThat(service.isKeyFileAvailable()).isTrue();
        assertThat(service.keyFileContent()).isEqualTo("abcdef12-3456");
    }

    private void configure(IndexNowService service, boolean enabled, String key) {
        ReflectionTestUtils.setField(service, "enabled", enabled);
        ReflectionTestUtils.setField(service, "key", key);
        ReflectionTestUtils.setField(service, "siteUrl", "https://www.caskbycask.net");
        ReflectionTestUtils.setField(service, "endpoint", "https://searchadvisor.naver.com/indexnow");
    }
}
