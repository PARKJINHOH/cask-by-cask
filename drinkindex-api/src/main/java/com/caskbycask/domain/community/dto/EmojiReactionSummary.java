package com.caskbycask.domain.community.dto;

import lombok.Getter;

@Getter
public class EmojiReactionSummary {

    private final Long emojiId;
    private final String unicode;
    private final String imageUrl;
    private final long count;
    private final boolean isMyReaction;

    public EmojiReactionSummary(Long emojiId, String unicode, String imageUrl,
                                long count, boolean isMyReaction) {
        this.emojiId     = emojiId;
        this.unicode     = unicode;
        this.imageUrl    = imageUrl;
        this.count       = count;
        this.isMyReaction = isMyReaction;
    }
}
