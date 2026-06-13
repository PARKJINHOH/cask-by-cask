package com.caskbycask.admin.dto;

import com.caskbycask.domain.email.entity.EmailTemplate;

import java.time.LocalDateTime;

public record EmailTemplateResponse(
        Long id,
        String name,
        String subject,
        String body,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static EmailTemplateResponse from(EmailTemplate t) {
        return new EmailTemplateResponse(t.getId(), t.getName(), t.getSubject(), t.getBody(),
                t.getCreatedAt(), t.getUpdatedAt());
    }
}
