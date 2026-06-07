package com.drinkindex.domain.feedback.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FeedbackCommentRequest(
        @NotBlank @Size(max = 5000) String content
) {}
