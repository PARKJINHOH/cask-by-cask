package com.caskbycask.domain.user.controller;

import com.caskbycask.domain.user.dto.*;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.service.AuthService;
import com.caskbycask.global.auth.RefreshTokenCookieProvider;
import com.caskbycask.global.auth.jwt.JwtProvider;
import com.caskbycask.global.auth.security.CustomUserDetailsService;
import com.caskbycask.global.config.SecurityConfig;
import org.springframework.http.ResponseCookie;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
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
    @MockitoBean RefreshTokenCookieProvider refreshTokenCookieProvider;

    // ───────────────────── signup ─────────────────────

    @Test
    @DisplayName("POST /api/auth/signup — 201 Created, 응답 바디 확인")
    void signup_success() throws Exception {
        SignupRequest request = new SignupRequest("test@example.com", "Password1!", "tester", true, true, false);
        UserResponse response = new UserResponse(1L, "test@example.com", "tester", Role.MEMBER, null, null, null, null, null, null, null, null, null, List.of(), false, false, false, null);

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
    @DisplayName("POST /api/auth/login — 200 OK, access 토큰은 바디 / refresh 는 httpOnly 쿠키")
    void login_success() throws Exception {
        LoginRequest request = new LoginRequest("test@example.com", "password123");
        LoginResponse body = LoginResponse.of("access_token", null, false, false);

        given(authService.login(any())).willReturn(new AuthLoginResult(body, "refresh_token"));
        given(refreshTokenCookieProvider.create(any())).willReturn(
                ResponseCookie.from("refresh_token", "refresh_token")
                        .httpOnly(true).path("/api/auth").build());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access_token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                // refresh 토큰은 바디에 없고 Set-Cookie(HttpOnly)로만 전달
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("HttpOnly")));
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
    @DisplayName("POST /api/auth/refresh — 쿠키의 refresh 로 200 OK, 새 access 반환 + 쿠키 회전")
    void refresh_success() throws Exception {
        given(refreshTokenCookieProvider.resolve(any())).willReturn("old_refresh_token");
        given(authService.refresh(any())).willReturn(new AuthRefreshResult("new_access", "new_refresh"));
        given(refreshTokenCookieProvider.create(any())).willReturn(
                ResponseCookie.from("refresh_token", "new_refresh")
                        .httpOnly(true).path("/api/auth").build());

        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("new_access"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("HttpOnly")));
    }

    @Test
    @DisplayName("POST /api/auth/refresh — refresh 쿠키 없으면 401")
    void refresh_fail_noCookie() throws Exception {
        given(refreshTokenCookieProvider.resolve(any())).willReturn(null);

        mockMvc.perform(post("/api/auth/refresh"))
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
