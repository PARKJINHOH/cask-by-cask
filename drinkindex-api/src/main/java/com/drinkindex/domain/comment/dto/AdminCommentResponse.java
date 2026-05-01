package com.drinkindex.domain.comment.dto;

import com.drinkindex.domain.comment.entity.CommunityComment;

import java.time.LocalDateTime;

public record AdminCommentResponse(
        Long id,
        Long userId,
        String userNickname,
        Long spiritId,
        String spiritNameKo,
        Long parentId,
        String content,
        Boolean isHidden,
        Integer reportCount,
        LocalDateTime createdAt
) {
    public static AdminCommentResponse from(CommunityComment comment) {
        return new AdminCommentResponse(
                comment.getId(),
                comment.getUser().getId(),
                comment.getUser().getNickname(),
                comment.getSpirit().getId(),
                comment.getSpirit().getNameKo(),
                comment.getParent() != null ? comment.getParent().getId() : null,
                comment.getContent(),
                comment.getIsHidden(),
                comment.getReportCount(),
                comment.getCreatedAt()
        );
    }
}
