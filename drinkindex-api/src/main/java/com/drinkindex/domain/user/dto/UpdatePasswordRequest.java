package com.drinkindex.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePasswordRequest(
        @Schema(description = "현재 비밀번호 (본인 확인용)")
        @NotBlank(message = "현재 비밀번호를 입력해주세요.")
        String currentPassword,

        @Schema(description = "새 비밀번호 (8자 이상)")
        @NotBlank(message = "새 비밀번호를 입력해주세요.")
        @Size(min = 8, message = "새 비밀번호는 8자 이상이어야 합니다.")
        String newPassword
) {}
