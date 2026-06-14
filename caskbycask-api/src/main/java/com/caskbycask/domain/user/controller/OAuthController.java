package com.caskbycask.domain.user.controller;

import com.caskbycask.domain.user.dto.*;
import com.caskbycask.domain.user.service.OAuthService;
import com.caskbycask.global.auth.RefreshTokenCookieProvider;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 소셜 로그인 공개 엔드포인트 (커스텀 REST 코드교환).
 * LOGIN/신규가입 완료 시 refresh 토큰은 httpOnly 쿠키로 내려보낸다(이메일 로그인과 동일).
 */
@RestController
@RequestMapping("/api/auth/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthService oAuthService;
    private final RefreshTokenCookieProvider refreshTokenCookieProvider;

    /** 인가 URL 발급 (state 포함). */
    @PostMapping("/authorize-url")
    public ResponseEntity<ApiResponse<OAuthAuthorizeUrlResponse>> authorizeUrl(
            @Valid @RequestBody OAuthAuthorizeUrlRequest request) {
        return ResponseEntity.ok(ApiResponse.success(oAuthService.authorizeUrl(request)));
    }

    /** 콜백 — 로그인/신규가입/연동안내 분기. */
    @PostMapping("/callback")
    public ResponseEntity<ApiResponse<OAuthCallbackResponse>> callback(
            @Valid @RequestBody OAuthCodeRequest request) {
        OAuthCallbackResult result = oAuthService.callback(request);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (result.refreshToken() != null) {
            builder.header(HttpHeaders.SET_COOKIE,
                    refreshTokenCookieProvider.create(result.refreshToken()).toString());
        }
        return builder.body(ApiResponse.success(result.body()));
    }

    /** 소셜 신규가입 완료 → 로그인. */
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<LoginResponse>> signup(
            @Valid @RequestBody OAuthSignupRequest request) {
        AuthLoginResult result = oAuthService.completeSignup(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE,
                        refreshTokenCookieProvider.create(result.refreshToken()).toString())
                .body(ApiResponse.success(result.body()));
    }
}
