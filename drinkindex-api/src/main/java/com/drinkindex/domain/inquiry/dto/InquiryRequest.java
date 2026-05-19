package com.drinkindex.domain.inquiry.dto;

import com.drinkindex.domain.inquiry.entity.enums.InquiryCategory;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InquiryRequest(
        @NotNull InquiryCategory category,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 5000) String body,
        @NotBlank @Email @Size(max = 200) String senderEmail
) {}
