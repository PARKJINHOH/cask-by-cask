package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.Message;
import com.drinkindex.domain.community.entity.MessageItem;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
public class MessageDetailResponse {

    private final Long id;
    private final String senderNickname;
    private final String receiverNickname;
    private final List<MessageItemResponse> items;
    private final LocalDateTime createdAt;

    public MessageDetailResponse(Message message, List<MessageItem> items) {
        this.id               = message.getId();
        this.senderNickname   = message.getSender().getNickname();
        this.receiverNickname = message.getReceiver().getNickname();
        this.items            = items.stream().map(MessageItemResponse::from).collect(Collectors.toList());
        this.createdAt        = message.getCreatedAt();
    }
}
