package com.drinkindex.domain.inquiry.dto;

import com.drinkindex.domain.inquiry.entity.Inquiry;
import com.drinkindex.domain.inquiry.entity.enums.InquiryCategory;
import com.drinkindex.domain.inquiry.entity.enums.InquiryStatus;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public record InquiryDetailResponse(
        Long id,
        InquiryCategory category,
        String title,
        String body,
        String senderEmail,
        List<String> imageUrls,
        InquiryStatus status,
        String adminNote,
        String replyBody,
        String repliedBy,
        LocalDateTime repliedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static InquiryDetailResponse from(Inquiry inquiry) {
        List<String> urls = (inquiry.getImageUrls() != null && !inquiry.getImageUrls().isBlank())
                ? Arrays.asList(inquiry.getImageUrls().split(","))
                : Collections.emptyList();
        return new InquiryDetailResponse(
                inquiry.getId(),
                inquiry.getCategory(),
                inquiry.getTitle(),
                inquiry.getBody(),
                inquiry.getSenderEmail(),
                urls,
                inquiry.getStatus(),
                inquiry.getAdminNote(),
                inquiry.getReplyBody(),
                inquiry.getRepliedBy(),
                inquiry.getRepliedAt(),
                inquiry.getCreatedAt(),
                inquiry.getUpdatedAt()
        );
    }
}
