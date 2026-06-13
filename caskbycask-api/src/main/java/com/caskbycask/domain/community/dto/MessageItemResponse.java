package com.caskbycask.domain.community.dto;

import com.caskbycask.domain.community.entity.MessageItem;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class MessageItemResponse {

    private final Long id;
    private final String senderNickname;
    private final String content;
    private final Boolean isRead;
    private final LocalDateTime readAt;
    private final LocalDateTime createdAt;

    private MessageItemResponse(MessageItem item) {
        this.id             = item.getId();
        this.senderNickname = item.getSender().getNickname();
        this.content        = item.getContent();
        this.isRead         = item.getIsRead();
        this.readAt         = item.getReadAt();
        this.createdAt      = item.getCreatedAt();
    }

    public static MessageItemResponse from(MessageItem item) {
        return new MessageItemResponse(item);
    }
}
