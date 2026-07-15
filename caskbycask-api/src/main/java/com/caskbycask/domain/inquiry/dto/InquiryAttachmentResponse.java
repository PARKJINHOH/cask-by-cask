package com.caskbycask.domain.inquiry.dto;

import com.caskbycask.domain.inquiry.entity.InquiryAttachmentMetadata;

public record InquiryAttachmentResponse(
        String fileKey,
        String originalFilename,
        String contentType,
        long size
) {
    public static InquiryAttachmentResponse from(InquiryAttachmentMetadata attachment) {
        return new InquiryAttachmentResponse(
                attachment.storedFilename(),
                attachment.originalFilename(),
                attachment.contentType(),
                attachment.size()
        );
    }
}
