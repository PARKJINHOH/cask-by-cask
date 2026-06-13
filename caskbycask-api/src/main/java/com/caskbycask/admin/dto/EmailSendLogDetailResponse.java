package com.caskbycask.admin.dto;

import com.caskbycask.domain.email.entity.EmailSendLog;
import com.caskbycask.domain.email.entity.EmailSendRecipient;
import com.caskbycask.domain.email.entity.enums.EmailSendType;

import java.time.LocalDateTime;
import java.util.List;

public record EmailSendLogDetailResponse(
        Long id,
        EmailSendType sendType,
        String subject,
        String body,
        int totalCount,
        int successCount,
        int failCount,
        LocalDateTime sentAt,
        List<RecipientDto> recipients
) {
    public record RecipientDto(String email, String nickname, boolean success, String errorMessage) {
        public static RecipientDto from(EmailSendRecipient r) {
            return new RecipientDto(r.getEmail(), r.getNickname(), r.isSuccess(), r.getErrorMessage());
        }
    }

    public static EmailSendLogDetailResponse from(EmailSendLog log) {
        return new EmailSendLogDetailResponse(
                log.getId(),
                log.getSendType(),
                log.getSubject(),
                log.getBody(),
                log.getTotalCount(),
                log.getSuccessCount(),
                log.getFailCount(),
                log.getSentAt(),
                log.getRecipients().stream().map(RecipientDto::from).toList()
        );
    }
}
