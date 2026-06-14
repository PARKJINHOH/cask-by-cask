package com.caskbycask.domain.user.dto;

import jakarta.validation.constraints.NotBlank;

/** 로그인 시점 NEEDS_LINK 후, 로그인한 사용자에 소셜을 연동 (티켓 기반). */
public record OAuthLinkRequest(
        @NotBlank String linkTicket
) {}
