package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.CommunityEmoji;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class EmojiAdminResponse {

    private final Long id;
    private final Long groupId;
    private final String groupName;
    private final String code;
    private final String unicode;
    private final String imageUrl;
    private final String label;
    private final Boolean isActive;
    private final Integer sortOrder;
    private final LocalDateTime createdAt;

    private EmojiAdminResponse(CommunityEmoji emoji) {
        this.id        = emoji.getId();
        this.groupId   = emoji.getGroup() != null ? emoji.getGroup().getId() : null;
        this.groupName = emoji.getGroup() != null ? emoji.getGroup().getName() : null;
        this.code      = emoji.getCode();
        this.unicode   = emoji.getUnicode();
        this.imageUrl  = emoji.getImageUrl();
        this.label     = emoji.getLabel();
        this.isActive  = emoji.getIsActive();
        this.sortOrder = emoji.getSortOrder();
        this.createdAt = emoji.getCreatedAt();
    }

    public static EmojiAdminResponse from(CommunityEmoji emoji) {
        return new EmojiAdminResponse(emoji);
    }
}
