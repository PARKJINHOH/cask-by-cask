package com.caskbycask.domain.user.dto;

import jakarta.validation.constraints.NotBlank;

/** 소셜 인가 URL 요청. provider="naver"|"google", redirectUri=프론트 콜백 URL(화이트리스트 검증). */
public record OAuthAuthorizeUrlRequest(
        @NotBlank String provider,
        @NotBlank String redirectUri
) {}
