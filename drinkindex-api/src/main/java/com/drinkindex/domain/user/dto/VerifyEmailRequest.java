package com.drinkindex.domain.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyEmailRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 6, max = 6, message = "인증 코드는 6자리입니다.") String code
) {}
