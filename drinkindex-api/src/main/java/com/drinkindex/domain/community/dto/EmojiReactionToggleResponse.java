package com.drinkindex.domain.community.dto;

import lombok.Getter;

@Getter
public class EmojiReactionToggleResponse {

    private final Long emojiId;
    private final long count;
    private final boolean isMyReaction;

    public EmojiReactionToggleResponse(Long emojiId, long count, boolean isMyReaction) {
        this.emojiId     = emojiId;
        this.count       = count;
        this.isMyReaction = isMyReaction;
    }
}
