package com.caskbycask.domain.feedback.dto;

import com.caskbycask.domain.feedback.entity.Feedback;
import com.caskbycask.domain.feedback.entity.enums.FeedbackStatus;
import com.caskbycask.domain.feedback.entity.enums.FeedbackType;

import java.time.LocalDateTime;

/**
 * 목록 응답.
 * authorNickname 은 관리자 조회이거나 공개글일 때만 채워짐(비공개글을 본인이 조회하는 경우 null).
 */
public record FeedbackListResponse(
        Long id,
        FeedbackType type,
        String title,
        FeedbackStatus status,
        int progress,
        int commentCount,
        boolean hasImages,
        boolean isPublic,
        String authorNickname,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static FeedbackListResponse from(Feedback f, boolean viewerIsAdmin) {
        boolean showNickname = viewerIsAdmin || Boolean.TRUE.equals(f.getIsPublic());
        return new FeedbackListResponse(
                f.getId(),
                f.getType(),
                f.getTitle(),
                f.getStatus(),
                f.getProgress(),
                f.getCommentCount(),
                f.getImageUrls() != null && !f.getImageUrls().isBlank(),
                Boolean.TRUE.equals(f.getIsPublic()),
                showNickname ? f.getAuthor().getNickname() : null,
                f.getCreatedAt(),
                f.getUpdatedAt()
        );
    }
}
