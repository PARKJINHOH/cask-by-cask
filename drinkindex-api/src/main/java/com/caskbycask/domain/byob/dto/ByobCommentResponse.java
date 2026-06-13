package com.caskbycask.domain.byob.dto;

import com.caskbycask.domain.byob.entity.ByobComment;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class ByobCommentResponse {

    private Long id;
    private Long byobId;
    private Long participantUserId;
    private String participantNickname;
    private Long authorUserId;
    private String authorNickname;
    private String content;
    private LocalDateTime createdAt;
    private Long parentId;
    private List<ByobCommentResponse> replies;

    public static ByobCommentResponse from(ByobComment c, List<ByobCommentResponse> replies) {
        return ByobCommentResponse.builder()
                .id(c.getId())
                .byobId(c.getByob().getId())
                .participantUserId(c.getParticipantUser().getId())
                .participantNickname(c.getParticipantUser().getNickname())
                .authorUserId(c.getAuthor().getId())
                .authorNickname(c.getAuthor().getNickname())
                .content(c.getContent())
                .createdAt(c.getCreatedAt())
                .parentId(c.getParentId())
                .replies(replies)
                .build();
    }
}
