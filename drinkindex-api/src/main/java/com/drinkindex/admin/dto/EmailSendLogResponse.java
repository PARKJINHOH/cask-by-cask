package com.drinkindex.admin.dto;

import com.drinkindex.domain.email.entity.EmailSendLog;
import com.drinkindex.domain.email.entity.enums.EmailSendType;

import java.time.LocalDateTime;

public record EmailSendLogResponse(
        Long id,
        EmailSendType sendType,
        String subject,
        int totalCount,
        int successCount,
        int failCount,
        LocalDateTime sentAt
) {
    public static EmailSendLogResponse from(EmailSendLog log) {
        return new EmailSendLogResponse(
                log.getId(),
                log.getSendType(),
                log.getSubject(),
                log.getTotalCount(),
                log.getSuccessCount(),
                log.getFailCount(),
                log.getSentAt()
        );
    }
}
