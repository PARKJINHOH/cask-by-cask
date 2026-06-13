package com.caskbycask.domain.feedback.dto;

import com.caskbycask.domain.feedback.entity.FeedbackComment;

import java.time.LocalDateTime;

/**
 * 댓글 응답.
 * - authorNickname: 관리자 조회 시에만 채워짐(일반 사용자 조회 시 null).
 * - isMine: 조회자 본인이 작성한 댓글 여부.
 */
public record FeedbackCommentResponse(
        Long id,
        String content,
        boolean isAdminReply,
        boolean isMine,
        String authorNickname,
        LocalDateTime createdAt
) {
    public static FeedbackCommentResponse from(FeedbackComment c, Long viewerId, boolean viewerIsAdmin) {
        boolean mine = c.getAuthor().getId().equals(viewerId);
        // 작성자 닉네임은 관리자에게만, 그리고 운영팀 답변이 아닌 회원 댓글에 한해 노출
        String nickname = (viewerIsAdmin && !Boolean.TRUE.equals(c.getIsAdminReply()))
                ? c.getAuthor().getNickname()
                : null;
        return new FeedbackCommentResponse(
                c.getId(),
                c.getContent(),
                Boolean.TRUE.equals(c.getIsAdminReply()),
                mine,
                nickname,
                c.getCreatedAt()
        );
    }
}
