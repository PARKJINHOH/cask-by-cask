package com.caskbycask.domain.feedback.dto;

import com.caskbycask.domain.feedback.entity.enums.FeedbackType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FeedbackCreateRequest(
        @NotNull FeedbackType type,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 100000) String content,
        Boolean isPublic
) {}
