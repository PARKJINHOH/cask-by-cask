package com.drinkindex.domain.legal.dto;

import com.drinkindex.domain.legal.entity.LegalDocument;
import com.drinkindex.domain.legal.entity.enums.LegalDocumentType;

import java.time.LocalDateTime;

public record LegalDocumentListItem(
        Long id,
        LegalDocumentType type,
        String version,
        Boolean isActive,
        String authorNickname,
        LocalDateTime createdAt
) {
    public static LegalDocumentListItem from(LegalDocument doc) {
        return new LegalDocumentListItem(
                doc.getId(),
                doc.getType(),
                doc.getVersion(),
                doc.getIsActive(),
                doc.getAuthor() != null ? doc.getAuthor().getNickname() : null,
                doc.getCreatedAt()
        );
    }
}
