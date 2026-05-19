package com.drinkindex.domain.inquiry.dto;

import com.drinkindex.domain.inquiry.entity.Inquiry;
import com.drinkindex.domain.inquiry.entity.enums.InquiryCategory;
import com.drinkindex.domain.inquiry.entity.enums.InquiryStatus;

import java.time.LocalDateTime;

public record InquiryListResponse(
        Long id,
        InquiryCategory category,
        String title,
        String senderEmail,
        boolean hasImages,
        InquiryStatus status,
        LocalDateTime createdAt
) {
    public static InquiryListResponse from(Inquiry inquiry) {
        return new InquiryListResponse(
                inquiry.getId(),
                inquiry.getCategory(),
                inquiry.getTitle(),
                inquiry.getSenderEmail(),
                inquiry.getImageUrls() != null && !inquiry.getImageUrls().isBlank(),
                inquiry.getStatus(),
                inquiry.getCreatedAt()
        );
    }
}
