package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.EmojiGroup;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class EmojiGroupAdminResponse {

    private final Long id;
    private final String name;
    private final Integer sortOrder;
    private final Boolean isActive;
    private final LocalDateTime createdAt;

    private EmojiGroupAdminResponse(EmojiGroup group) {
        this.id        = group.getId();
        this.name      = group.getName();
        this.sortOrder = group.getSortOrder();
        this.isActive  = group.getIsActive();
        this.createdAt = group.getCreatedAt();
    }

    public static EmojiGroupAdminResponse from(EmojiGroup group) {
        return new EmojiGroupAdminResponse(group);
    }
}
