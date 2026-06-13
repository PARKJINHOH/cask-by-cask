package com.caskbycask.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 토큰 재발급(/api/auth/refresh) 응답 바디.
 * refresh 토큰은 httpOnly 쿠키로만 전달되므로 바디에는 access 토큰만 담는다.
 */
public record AccessTokenResponse(
        @Schema(description = "액세스 토큰 (Authorization 헤더에 사용)")
        String accessToken,
        @Schema(description = "토큰 타입 (고정값: Bearer)")
        String tokenType
) {
    public static AccessTokenResponse of(String accessToken) {
        return new AccessTokenResponse(accessToken, "Bearer");
    }
}
