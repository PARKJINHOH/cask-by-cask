package com.caskbycask.domain.legal.dto;

import com.caskbycask.domain.legal.entity.LegalDocument;
import com.caskbycask.domain.legal.entity.enums.LegalDocumentType;

import java.time.LocalDateTime;

public record LegalDocumentResponse(
        Long id,
        LegalDocumentType type,
        String version,
        String content,
        String contentSanitized,
        Boolean isActive,
        String authorNickname,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static LegalDocumentResponse from(LegalDocument doc) {
        return new LegalDocumentResponse(
                doc.getId(),
                doc.getType(),
                doc.getVersion(),
                doc.getContent(),
                doc.getContentSanitized(),
                doc.getIsActive(),
                doc.getAuthor() != null ? doc.getAuthor().getNickname() : null,
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }

    public static LegalDocumentResponse publicFrom(LegalDocument doc) {
        return new LegalDocumentResponse(
                doc.getId(),
                doc.getType(),
                doc.getVersion(),
                null,
                doc.getContentSanitized(),
                doc.getIsActive(),
                null,
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }
}
