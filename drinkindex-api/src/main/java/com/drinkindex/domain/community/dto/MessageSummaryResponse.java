package com.drinkindex.domain.community.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MessageSummaryResponse {

    private final Long id;
    private final String partnerNickname;
    private final String lastMessage;
    private final Boolean hasUnread;
    private final LocalDateTime createdAt;
}
