package com.drinkindex.domain.user.controller;

import com.drinkindex.domain.user.dto.*;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.service.AuthService;
import com.drinkindex.global.auth.jwt.JwtProvider;
import com.drinkindex.global.auth.security.CustomUserDetailsService;
import com.drinkindex.global.config.SecurityConfig;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean AuthService authService;
    @MockitoBean JwtProvider jwtProvider;
    @MockitoBean CustomUserDetailsService customUserDetailsService;

    // ───────────────────── signup ─────────────────────

    @Test
    @DisplayName("POST /api/auth/signup — 201 Created, 응답 바디 확인")
    void signup_success() throws Exception {
        SignupRequest request = new SignupRequest("test@example.com", "Password1!", "tester", true, true, false);
        UserResponse response = new UserResponse(1L, "test@example.com", "tester", Role.MEMBER, null, null, null, null, null, null, null, null, null, List.of(), false, false);

        given(authService.signup(any())).willReturn(response);

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("test@example.com"))
                .andExpect(jsonPath("$.data.nickname").value("tester"))
                .andExpect(jsonPath("$.data.role").value("MEMBER"));
    }

    @Test
    @DisplayName("POST /api/auth/signup — 이메일 형식 오류 시 400")
    void signup_fail_invalidEmail() throws Exception {
        SignupRequest request = new SignupRequest("not-an-email", "password123", "tester", true, true, false);

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/auth/signup — 이메일 중복 시 409")
    void signup_fail_duplicateEmail() throws Exception {
        SignupRequest request = new SignupRequest("dup@example.com", "Password1!", "tester", true, true, false);

        given(authService.signup(any())).willThrow(new CustomException(ErrorCode.DUPLICATE_EMAIL));

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("USER_002"));
    }

    // ───────────────────── login ─────────────────────

    @Test
    @DisplayName("POST /api/auth/login — 200 OK, 토큰 반환")
    void login_success() throws Exception {
        LoginRequest request = new LoginRequest("test@example.com", "password123");
        LoginResponse response = LoginResponse.of(TokenResponse.of("access_token", "refresh_token"), null, false, false);

        given(authService.login(any())).willReturn(response);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access_token"))
                .andExpect(jsonPath("$.data.refreshToken").value("refresh_token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
    }

    @Test
    @DisplayName("POST /api/auth/login — 잘못된 비밀번호 시 400")
    void login_fail_wrongPassword() throws Exception {
        LoginRequest request = new LoginRequest("test@example.com", "wrongpw");

        given(authService.login(any())).willThrow(new CustomException(ErrorCode.INVALID_PASSWORD));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("USER_004"));
    }

    // ───────────────────── refresh ─────────────────────

    @Test
    @DisplayName("POST /api/auth/refresh — 200 OK, 새 토큰 반환")
    void refresh_success() throws Exception {
        RefreshRequest request = new RefreshRequest("old_refresh_token");
        TokenResponse response = TokenResponse.of("new_access", "new_refresh");

        given(authService.refresh(any())).willReturn(response);

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("new_access"))
                .andExpect(jsonPath("$.data.refreshToken").value("new_refresh"));
    }

    @Test
    @DisplayName("POST /api/auth/refresh — Redis 토큰 없을 시 401")
    void refresh_fail_tokenNotFound() throws Exception {
        RefreshRequest request = new RefreshRequest("orphan_token");

        given(authService.refresh(any())).willThrow(new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_005"));
    }

    // ───────────────────── logout ─────────────────────

    @Test
    @DisplayName("POST /api/auth/logout — 인증 없이 요청 시 401")
    void logout_unauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized());
    }
}
