package com.caskbycask.domain.inquiry.entity;

public record InquiryAttachmentMetadata(
        String originalFilename,
        String storedFilename,
        String subPath,
        String contentType,
        long size
) {}
