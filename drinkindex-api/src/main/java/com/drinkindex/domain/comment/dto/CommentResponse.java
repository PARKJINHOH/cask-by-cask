package com.drinkindex.domain.comment.dto;

import com.drinkindex.domain.comment.entity.CommunityComment;

import java.time.LocalDateTime;
import java.util.List;

public record CommentResponse(
        Long id,
        Long userId,
        String nickname,
        String content,
        Integer likeCount,
        LocalDateTime createdAt,
        List<CommentResponse> children
) {
    public static CommentResponse from(CommunityComment comment, List<CommentResponse> children) {
        return new CommentResponse(
                comment.getId(),
                comment.getUser().getId(),
                comment.getUser().getNickname(),
                comment.getContent(),
                comment.getLikeCount(),
                comment.getCreatedAt(),
                children
        );
    }

    public static CommentResponse from(CommunityComment comment) {
        return from(comment, List.of());
    }
}
