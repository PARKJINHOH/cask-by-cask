package com.drinkindex.domain.inquiry.dto;

import com.drinkindex.domain.inquiry.entity.enums.InquiryStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateInquiryStatusRequest(
        @NotNull InquiryStatus status
) {}
