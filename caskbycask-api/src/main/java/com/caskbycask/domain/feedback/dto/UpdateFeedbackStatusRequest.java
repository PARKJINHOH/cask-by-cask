package com.caskbycask.domain.feedback.dto;

import com.caskbycask.domain.feedback.entity.enums.FeedbackStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * 관리자 상태/진척률 변경 요청.
 * progress 가 null 이면 상태 기반 기본 제안값 적용.
 */
public record UpdateFeedbackStatusRequest(
        @NotNull FeedbackStatus status,
        @Min(0) @Max(100) Integer progress
) {}
