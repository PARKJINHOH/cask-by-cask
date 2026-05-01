package com.drinkindex.domain.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateDistilleryManagerRequest(
        @NotBlank @Email(message = "올바른 이메일 형식이어야 합니다.") String email,
        @NotBlank @Size(min = 8, max = 100, message = "비밀번호는 8자 이상 100자 이하여야 합니다.") String password,
        @NotBlank @Size(min = 2, max = 50, message = "닉네임은 2자 이상 50자 이하여야 합니다.") String nickname,
        @NotNull(message = "증류소 ID는 필수입니다.") Long distilleryId
) {}
