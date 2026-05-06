package com.drinkindex.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record TokenResponse(
        @Schema(description = "액세스 토큰 (Authorization 헤더에 사용)")
        String accessToken,
        @Schema(description = "리프레시 토큰 (액세스 토큰 재발급에 사용)")
        String refreshToken,
        @Schema(description = "토큰 타입 (고정값: Bearer)")
        String tokenType
) {
    public static TokenResponse of(String accessToken, String refreshToken) {
        return new TokenResponse(accessToken, refreshToken, "Bearer");
    }
}
