package com.caskbycask.domain.inquiry.service;

import org.springframework.core.io.Resource;

public record InquiryAttachmentDownload(
        Resource resource,
        String originalFilename,
        String contentType,
        long size
) {}
