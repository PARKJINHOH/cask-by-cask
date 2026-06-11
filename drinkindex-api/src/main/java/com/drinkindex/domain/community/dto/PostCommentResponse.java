package com.drinkindex.domain.community.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class PostCommentResponse {

    private final Long id;
    private final String authorNickname;
    private final String authorRole;           // null if anonymous or deleted
    private final Integer authorLevel;         // null if anonymous or deleted
    private final Integer authorMaturingPower; // null if anonymous or deleted
    private final Boolean authorNicknameFixed; // null if anonymous or deleted
    private final String authorProfileImageUrl; // null if anonymous or deleted
    private final Long authorId;               // null if anonymous, blocked, or deleted
    private final String content;
    private final String mentionedUserNickname;
    private final List<EmojiReactionSummary> emojiReactions;
    private final List<PostCommentResponse> children;
    private final LocalDateTime createdAt;
    private final Boolean isMyComment;
    private final Boolean isDeleted;
    private final Boolean isHidden; // true: 신고/관리자에 의해 숨김 처리됨 (내용 마스킹)
    private final Boolean isSecret;
    private final Boolean isSecretMasked; // true: 비밀댓글이지만 열람 권한이 없어 마스킹됨
}
