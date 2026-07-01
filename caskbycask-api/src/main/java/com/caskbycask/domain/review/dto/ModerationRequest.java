package com.caskbycask.domain.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record ModerationRequest(
        @Schema(description = "Moderation reason")
        @Size(max = 500, message = "Reason must be 500 characters or less.")
        String reason,

        @Schema(description = "Whether to send an email to the author")
        Boolean sendEmail
) {
    public boolean shouldSendEmail() {
        return Boolean.TRUE.equals(sendEmail);
    }
}
