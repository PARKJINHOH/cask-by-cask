package com.caskbycask.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PasswordResetVerifyRequest(
        @Schema(description = "이메일 주소")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        @NotBlank(message = "이메일을 입력해주세요.")
        String email,

        @Schema(description = "이메일로 받은 6자리 인증 코드")
        @NotBlank(message = "인증 코드를 입력해주세요.")
        String code
) {}
