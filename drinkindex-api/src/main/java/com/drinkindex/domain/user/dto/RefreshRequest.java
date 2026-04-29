package com.drinkindex.domain.user.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @NotBlank(message = "Refresh Token을 입력해주세요.")
        String refreshToken
) {}
