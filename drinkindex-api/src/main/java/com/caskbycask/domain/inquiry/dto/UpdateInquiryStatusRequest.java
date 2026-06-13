package com.caskbycask.domain.inquiry.dto;

import com.caskbycask.domain.inquiry.entity.enums.InquiryStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateInquiryStatusRequest(
        @NotNull InquiryStatus status
) {}
