package com.drinkindex.domain.feedback.dto;

import com.drinkindex.domain.feedback.entity.Feedback;
import com.drinkindex.domain.feedback.entity.FeedbackComment;
import com.drinkindex.domain.feedback.entity.enums.FeedbackStatus;
import com.drinkindex.domain.feedback.entity.enums.FeedbackType;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * 상세 응답.
 * - editable: 조회자가 작성자 본인이며 접수(RECEIVED) 상태일 때만 true.
 * - authorNickname: 관리자 조회 시에만 채워짐.
 * - comments: 댓글 스레드 전체.
 */
public record FeedbackDetailResponse(
        Long id,
        FeedbackType type,
        String title,
        String content,
        List<String> imageUrls,
        FeedbackStatus status,
        int progress,
        int commentCount,
        boolean editable,
        String authorNickname,
        LocalDateTime resolvedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<FeedbackCommentResponse> comments
) {
    public static FeedbackDetailResponse from(
            Feedback f,
            List<FeedbackComment> comments,
            Long viewerId,
            boolean viewerIsAdmin
    ) {
        List<String> urls = (f.getImageUrls() != null && !f.getImageUrls().isBlank())
                ? Arrays.asList(f.getImageUrls().split(","))
                : Collections.emptyList();

        List<FeedbackCommentResponse> commentDtos = comments.stream()
                .map(c -> FeedbackCommentResponse.from(c, viewerId, viewerIsAdmin))
                .toList();

        return new FeedbackDetailResponse(
                f.getId(),
                f.getType(),
                f.getTitle(),
                f.getContent(),
                urls,
                f.getStatus(),
                f.getProgress(),
                f.getCommentCount(),
                f.isOwnedBy(viewerId) && f.isEditable(),
                viewerIsAdmin ? f.getAuthor().getNickname() : null,
                f.getResolvedAt(),
                f.getCreatedAt(),
                f.getUpdatedAt(),
                commentDtos
        );
    }
}
