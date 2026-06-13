package com.caskbycask.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SendEmailRequest(
        @Schema(description = "이메일 제목")
        @NotBlank(message = "제목을 입력해주세요.")
        String subject,

        @Schema(description = "이메일 본문 (HTML 허용)")
        @NotBlank(message = "본문을 입력해주세요.")
        String body,

        @Schema(description = "테스트 발송 대상 이메일 (null이면 전체 발송)")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        String testEmail
) {}
