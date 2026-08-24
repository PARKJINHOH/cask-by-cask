package com.caskbycask.domain.deal.controller;

import com.caskbycask.domain.deal.dto.CreateDealRequest;
import com.caskbycask.domain.deal.dto.DealPostDetailResponse;
import com.caskbycask.domain.deal.service.DealAdminService;
import com.caskbycask.domain.deal.service.DealKrwBackfillService;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.global.auth.jwt.JwtProvider;
import com.caskbycask.global.auth.security.CustomUserDetailsService;
import com.caskbycask.global.config.SecurityConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /api/admin/deals — 관리자 직접 가격 등록 배선·검증 확인. */
@WebMvcTest(controllers = DealAdminController.class)
@Import(SecurityConfig.class)
class DealAdminControllerCreateTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean DealAdminService dealAdminService;
    @MockitoBean DealKrwBackfillService dealKrwBackfillService;
    @MockitoBean JwtProvider jwtProvider;
    @MockitoBean CustomUserDetailsService customUserDetailsService;

    private CreateDealRequest validRequest() {
        return new CreateDealRequest(
                7L, "발베니 12", "WHISKY", 700, 120000, 90000,
                "KRW", "트레이더스", null, null, null,
                StoreType.DOMESTIC, null, LocalDate.of(2026, 7, 30));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("관리자 권한으로 등록하면 201 Created 를 반환한다")
    void create_returnsCreated() throws Exception {
        given(dealAdminService.create(any(CreateDealRequest.class)))
                .willReturn(org.mockito.Mockito.mock(DealPostDetailResponse.class));

        mockMvc.perform(post("/api/admin/deals")
                        .with(org.springframework.security.test.web.servlet.request
                                .SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated());

        verify(dealAdminService).create(any(CreateDealRequest.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("주류 연결이 없으면 400 — 차트에 집계되지 않는 데이터를 막는다")
    void create_rejectsMissingSpiritId() throws Exception {
        CreateDealRequest noSpirit = new CreateDealRequest(
                null, null, null, null, 1000, 900,
                null, null, null, null, null, null, null, null);

        mockMvc.perform(post("/api/admin/deals")
                        .with(org.springframework.security.test.web.servlet.request
                                .SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(noSpirit)))
                .andExpect(status().isBadRequest());

        verify(dealAdminService, never()).create(any(CreateDealRequest.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("출처 URL 이 http(s) 형식이 아니면 400")
    void create_rejectsNonHttpSourceUrl() throws Exception {
        CreateDealRequest badUrl = new CreateDealRequest(
                7L, null, null, null, 1000, 900,
                null, null, null, null, null, null, "javascript:alert(1)", null);

        mockMvc.perform(post("/api/admin/deals")
                        .with(org.springframework.security.test.web.servlet.request
                                .SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badUrl)))
                .andExpect(status().isBadRequest());

        verify(dealAdminService, never()).create(any(CreateDealRequest.class));
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("일반 회원은 /api/admin/** 규칙에 막혀 등록할 수 없다")
    void create_forbiddenForNonAdmin() throws Exception {
        mockMvc.perform(post("/api/admin/deals")
                        .with(org.springframework.security.test.web.servlet.request
                                .SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isForbidden());

        verify(dealAdminService, never()).create(any(CreateDealRequest.class));
    }
}
