package com.drinkindex.domain.feedback.dto;

import com.drinkindex.domain.feedback.entity.Feedback;
import com.drinkindex.domain.feedback.entity.enums.FeedbackStatus;
import com.drinkindex.domain.feedback.entity.enums.FeedbackType;

import java.time.LocalDateTime;

/**
 * 목록 응답.
 * authorNickname 은 관리자 조회 시에만 채워짐(일반 사용자 조회 시 null).
 */
public record FeedbackListResponse(
        Long id,
        FeedbackType type,
        String title,
        FeedbackStatus status,
        int progress,
        int commentCount,
        boolean hasImages,
        String authorNickname,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static FeedbackListResponse from(Feedback f, boolean viewerIsAdmin) {
        return new FeedbackListResponse(
                f.getId(),
                f.getType(),
                f.getTitle(),
                f.getStatus(),
                f.getProgress(),
                f.getCommentCount(),
                f.getImageUrls() != null && !f.getImageUrls().isBlank(),
                viewerIsAdmin ? f.getAuthor().getNickname() : null,
                f.getCreatedAt(),
                f.getUpdatedAt()
        );
    }
}
