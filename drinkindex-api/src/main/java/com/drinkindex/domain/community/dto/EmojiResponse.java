package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.CommunityEmoji;
import lombok.Getter;

@Getter
public class EmojiResponse {

    private final Long id;
    private final Long groupId;
    private final String groupName;
    private final String unicode;
    private final String imageUrl;
    private final String label;
    private final Integer sortOrder;

    private EmojiResponse(CommunityEmoji emoji) {
        this.id        = emoji.getId();
        this.groupId   = emoji.getGroup() != null ? emoji.getGroup().getId() : null;
        this.groupName = emoji.getGroup() != null ? emoji.getGroup().getName() : null;
        this.unicode   = emoji.getUnicode();
        this.imageUrl  = emoji.getImageUrl();
        this.label     = emoji.getLabel();
        this.sortOrder = emoji.getSortOrder();
    }

    public static EmojiResponse from(CommunityEmoji emoji) {
        return new EmojiResponse(emoji);
    }
}
