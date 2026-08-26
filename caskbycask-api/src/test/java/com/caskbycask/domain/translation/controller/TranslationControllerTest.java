package com.caskbycask.domain.translation.controller;

import com.caskbycask.domain.translation.dto.TranslationResponse;
import com.caskbycask.domain.translation.entity.enums.TranslationLanguage;
import com.caskbycask.domain.translation.entity.enums.TranslationResourceType;
import com.caskbycask.domain.translation.service.TranslationService;
import com.caskbycask.global.auth.jwt.JwtProvider;
import com.caskbycask.global.auth.security.CustomUserDetailsService;
import com.caskbycask.global.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TranslationController.class)
@Import(SecurityConfig.class)
class TranslationControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean TranslationService translationService;
    @MockitoBean JwtProvider jwtProvider;
    @MockitoBean CustomUserDetailsService customUserDetailsService;

    @Test
    void anonymousVisitorCanRequestResourceBoundTranslation() throws Exception {
        given(translationService.translate(any())).willReturn(new TranslationResponse(
                TranslationResourceType.REVIEW, 7L, TranslationLanguage.EN,
                Map.of("comment", "Great review")));

        mockMvc.perform(post("/api/translations")
                        .contentType("application/json")
                        .content("""
                                {"resourceType":"REVIEW","resourceId":7,"targetLanguage":"en"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fields.comment").value("Great review"));
    }

    @Test
    void unsupportedLanguageIsRejectedBeforeService() throws Exception {
        mockMvc.perform(post("/api/translations")
                        .contentType("application/json")
                        .content("""
                                {"resourceType":"REVIEW","resourceId":7,"targetLanguage":"ja"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("COMMON_002"));
    }
}
