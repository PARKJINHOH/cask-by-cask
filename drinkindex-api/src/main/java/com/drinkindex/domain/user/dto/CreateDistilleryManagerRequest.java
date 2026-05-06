package com.drinkindex.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateDistilleryManagerRequest(
        @Schema(description = "이메일 주소")
        @NotBlank @Email(message = "올바른 이메일 형식이어야 합니다.") String email,
        @Schema(description = "비밀번호 (8자 이상 100자 이하)")
        @NotBlank @Size(min = 8, max = 100, message = "비밀번호는 8자 이상 100자 이하여야 합니다.") String password,
        @Schema(description = "닉네임 (2자 이상 50자 이하)")
        @NotBlank @Size(min = 2, max = 50, message = "닉네임은 2자 이상 50자 이하여야 합니다.") String nickname,
        @Schema(description = "담당 증류소 ID")
        @NotNull(message = "증류소 ID는 필수입니다.") Long distilleryId
) {}
