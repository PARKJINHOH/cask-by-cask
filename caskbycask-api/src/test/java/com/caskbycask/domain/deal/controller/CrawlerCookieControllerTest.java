package com.caskbycask.domain.deal.controller;

import com.caskbycask.domain.deal.dto.CrawlerCookieRequest;
import com.caskbycask.domain.deal.entity.CrawlerCookie;
import com.caskbycask.domain.deal.service.CrawlerCookieService;
import com.caskbycask.global.auth.jwt.JwtProvider;
import com.caskbycask.global.auth.security.CustomUserDetailsService;
import com.caskbycask.global.config.SecurityConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CrawlerCookieController.class, properties = "caskbycask.internal-api-key=test-secret-key-12345")
@Import(SecurityConfig.class)
class CrawlerCookieControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean CrawlerCookieService crawlerCookieService;
    @MockitoBean JwtProvider jwtProvider;
    @MockitoBean CustomUserDetailsService customUserDetailsService;

    @Value("${caskbycask.internal-api-key:}")
    private String internalApiKey;

    // ───────────────────── GET /api/internal/crawler-settings ─────────────────────

    @Test
    @DisplayName("GET /api/internal/crawler-settings — 올바른 X-Internal-Key 헤더 제공 시 200 OK 및 쿠키 반환")
    void getSettings_success() throws Exception {
        CrawlerCookie mockCookie = new CrawlerCookie("aut_value", "ses_value");
        given(crawlerCookieService.getCookies()).willReturn(mockCookie);

        mockMvc.perform(get("/api/internal/crawler-settings")
                        .header("X-Internal-Key", internalApiKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.nidAut").value("aut_value"))
                .andExpect(jsonPath("$.data.nidSes").value("ses_value"));
    }

    @Test
    @DisplayName("GET /api/internal/crawler-settings — X-Internal-Key 헤더 오류 시 401 Unauthorized")
    void getSettings_fail_unauthorized() throws Exception {
        mockMvc.perform(get("/api/internal/crawler-settings")
                        .header("X-Internal-Key", internalApiKey + "wrong_suffix_key"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("AUTH_001"));
    }

    // ───────────────────── POST /api/admin/crawler-settings ─────────────────────

    @Test
    @DisplayName("POST /api/admin/crawler-settings — 인증 없는 일반 접근 시 401 Unauthorized")
    void updateSettings_fail_unauthorized() throws Exception {
        CrawlerCookieRequest request = new CrawlerCookieRequest("new_aut", "new_ses");

        mockMvc.perform(post("/api/admin/crawler-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("POST /api/admin/crawler-settings — ADMIN 권한 접근 시 200 OK 및 갱신 성공")
    void updateSettings_success() throws Exception {
        CrawlerCookieRequest request = new CrawlerCookieRequest("new_aut", "new_ses");

        mockMvc.perform(post("/api/admin/crawler-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(crawlerCookieService).updateCookies(any(CrawlerCookieRequest.class));
    }
}
