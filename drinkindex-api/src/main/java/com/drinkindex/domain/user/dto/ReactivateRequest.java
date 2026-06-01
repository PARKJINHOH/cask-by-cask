package com.drinkindex.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * 휴면 계정 해제 요청 — 이메일/비밀번호 검증 + 이메일 인증코드 확인 후 휴면 해제.
 */
public record ReactivateRequest(
        @Schema(description = "이메일 주소")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        @NotBlank(message = "이메일을 입력해주세요.")
        String email,

        @Schema(description = "비밀번호 (본인 확인용)")
        @NotBlank(message = "비밀번호를 입력해주세요.")
        String password,

        @Schema(description = "이메일로 발송된 인증 코드")
        @NotBlank(message = "인증 코드를 입력해주세요.")
        String code
) {}
