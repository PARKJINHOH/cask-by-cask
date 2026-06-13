package com.caskbycask.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FindEmailRequest(
        @Schema(description = "가입 시 사용한 닉네임")
        @NotBlank(message = "닉네임을 입력해주세요.")
        @Size(min = 2, max = 8, message = "닉네임은 2자 이상 8자 이하로 입력해주세요.")
        String nickname
) {}
