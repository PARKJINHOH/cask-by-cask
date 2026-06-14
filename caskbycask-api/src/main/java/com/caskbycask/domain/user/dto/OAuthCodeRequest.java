package com.caskbycask.domain.user.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * authorization code 교환 요청 (콜백/연동 공용).
 * redirectUri 는 인가 요청 때와 동일해야 하며 화이트리스트로 검증된다.
 */
public record OAuthCodeRequest(
        @NotBlank String provider,
        @NotBlank String code,
        @NotBlank String state,
        @NotBlank String redirectUri
) {}
