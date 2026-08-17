package com.caskbycask.domain.seo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

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

    @Test
    @DisplayName("Bing 과 네이버에 모두 통지하며 레거시 단일 설정도 중복 없이 합친다")
    void collects_every_configured_endpoint() {
        IndexNowService service = new IndexNowService(new ObjectMapper());
        ReflectionTestUtils.setField(service, "endpoints",
                List.of("https://www.bing.com/indexnow", "  https://searchadvisor.naver.com/indexnow  "));
        // 같은 주소를 레거시 설정으로도 들고 있는 배포가 두 번 보내지 않아야 한다.
        ReflectionTestUtils.setField(service, "legacyEndpoint", "https://www.bing.com/indexnow");

        List<String> targets = ReflectionTestUtils.invokeMethod(service, "targetEndpoints");

        assertThat(targets).containsExactly(
                "https://www.bing.com/indexnow",
                "https://searchadvisor.naver.com/indexnow");
    }

    @Test
    @DisplayName("보낼 엔드포인트가 하나도 없으면 통지 설정을 무효로 본다")
    void requires_at_least_one_endpoint() {
        IndexNowService service = new IndexNowService(new ObjectMapper());
        ReflectionTestUtils.setField(service, "enabled", true);
        ReflectionTestUtils.setField(service, "key", "abcdef12-3456");
        ReflectionTestUtils.setField(service, "siteUrl", "https://www.caskbycask.net");
        ReflectionTestUtils.setField(service, "endpoints", List.of());
        ReflectionTestUtils.setField(service, "legacyEndpoint", "");

        assertThat(service.isKeyFileAvailable()).isFalse();
    }

    private void configure(IndexNowService service, boolean enabled, String key) {
        ReflectionTestUtils.setField(service, "enabled", enabled);
        ReflectionTestUtils.setField(service, "key", key);
        ReflectionTestUtils.setField(service, "siteUrl", "https://www.caskbycask.net");
        ReflectionTestUtils.setField(service, "endpoints",
                List.of("https://www.bing.com/indexnow", "https://searchadvisor.naver.com/indexnow"));
        ReflectionTestUtils.setField(service, "legacyEndpoint", "");
    }
}
