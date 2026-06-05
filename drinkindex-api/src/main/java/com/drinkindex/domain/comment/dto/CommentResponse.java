package com.drinkindex.domain.comment.dto;

import com.drinkindex.domain.comment.entity.CommunityComment;
import com.drinkindex.domain.community.dto.EmojiReactionSummary;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

public record CommentResponse(
        @Schema(description = "댓글 고유 ID")
        Long id,
        @Schema(description = "작성자 사용자 ID")
        Long userId,
        @Schema(description = "작성자 닉네임")
        String nickname,
        @Schema(description = "댓글 내용")
        String content,
        @Schema(description = "좋아요 수")
        Integer likeCount,
        @Schema(description = "작성 일시")
        LocalDateTime createdAt,
        // [패치 13] 술 상세 댓글에도 이모지 반응 (게시판 댓글과 통일)
        @Schema(description = "이모지 반응 요약")
        List<EmojiReactionSummary> emojiReactions,
        @Schema(description = "대댓글 목록")
        List<CommentResponse> children
) {
    // [패치 13] 이모지 반응 포함 변환
    public static CommentResponse from(CommunityComment comment,
                                       List<EmojiReactionSummary> emojiReactions,
                                       List<CommentResponse> children) {
        return new CommentResponse(
                comment.getId(),
                comment.getUser().getId(),
                comment.getUser().getNickname(),
                comment.getContent(),
                comment.getLikeCount(),
                comment.getCreatedAt(),
                emojiReactions,
                children
        );
    }

    public static CommentResponse from(CommunityComment comment, List<CommentResponse> children) {
        return from(comment, List.of(), children);
    }

    public static CommentResponse from(CommunityComment comment) {
        return from(comment, List.of(), List.of());
    }
}
