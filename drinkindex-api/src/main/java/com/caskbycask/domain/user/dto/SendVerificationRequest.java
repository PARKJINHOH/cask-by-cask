package com.caskbycask.domain.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SendVerificationRequest(
        @Email @NotBlank String email
) {}
