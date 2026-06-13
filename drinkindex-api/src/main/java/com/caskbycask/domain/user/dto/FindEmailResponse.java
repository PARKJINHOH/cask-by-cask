package com.caskbycask.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record FindEmailResponse(
        @Schema(description = "마스킹 처리된 가입 이메일 (예: ab***@gmail.com)")
        String maskedEmail
) {}
