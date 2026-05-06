package com.drinkindex.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @Schema(description = "리프레시 토큰")
        @NotBlank(message = "Refresh Token을 입력해주세요.")
        String refreshToken
) {}
