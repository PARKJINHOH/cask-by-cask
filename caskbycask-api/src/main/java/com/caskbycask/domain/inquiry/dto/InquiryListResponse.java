package com.caskbycask.domain.inquiry.dto;

import com.caskbycask.domain.inquiry.entity.Inquiry;
import com.caskbycask.domain.inquiry.entity.enums.InquiryCategory;
import com.caskbycask.domain.inquiry.entity.enums.InquiryStatus;

import java.time.LocalDateTime;

public record InquiryListResponse(
        Long id,
        InquiryCategory category,
        String title,
        String senderEmail,
        boolean hasAttachments,
        InquiryStatus status,
        LocalDateTime createdAt
) {
    public static InquiryListResponse from(Inquiry inquiry) {
        return new InquiryListResponse(
                inquiry.getId(),
                inquiry.getCategory(),
                inquiry.getTitle(),
                inquiry.getSenderEmail(),
                inquiry.getAttachmentData() != null && !inquiry.getAttachmentData().isBlank(),
                inquiry.getStatus(),
                inquiry.getCreatedAt()
        );
    }
}
