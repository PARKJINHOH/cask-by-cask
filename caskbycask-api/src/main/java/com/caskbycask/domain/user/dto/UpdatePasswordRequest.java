package com.caskbycask.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdatePasswordRequest(
        @Schema(description = "현재 비밀번호 (본인 확인용)")
        @NotBlank(message = "현재 비밀번호를 입력해주세요.")
        String currentPassword,

        @Schema(description = "새 비밀번호 (영문+숫자+특수문자 포함, 7~100자)")
        @NotBlank(message = "새 비밀번호를 입력해주세요.")
        @Size(min = 7, max = 100, message = "새 비밀번호는 7자 이상 100자 이하이어야 합니다.")
        @Pattern(regexp = "^[a-zA-Z\\d!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]+$",
                 message = "비밀번호는 영문, 숫자, 특수문자만 사용 가능합니다.")
        @Pattern(regexp = ".*\\d.*",
                 message = "비밀번호에 숫자가 최소 1개 포함되어야 합니다.")
        @Pattern(regexp = ".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*",
                 message = "비밀번호에 특수문자가 최소 1개 포함되어야 합니다.")
        String newPassword
) {}
