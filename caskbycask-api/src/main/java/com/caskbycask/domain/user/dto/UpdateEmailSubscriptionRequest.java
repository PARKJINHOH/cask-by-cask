package com.caskbycask.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record UpdateEmailSubscriptionRequest(
        @Schema(description = "이메일 수신 동의 여부")
        boolean emailSubscribed
) {}
