package com.caskbycask.domain.community.dto;

import com.caskbycask.domain.community.entity.Notification;
import com.caskbycask.domain.community.entity.enums.NotificationType;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class NotificationResponse {

    private final Long id;
    private final NotificationType type;
    private final String message;
    private final String targetType;
    private final Long targetId;
    private final Boolean isRead;
    private final LocalDateTime createdAt;

    private NotificationResponse(Notification n) {
        this.id         = n.getId();
        this.type       = n.getType();
        this.message    = n.getMessage();
        this.targetType = n.getTargetType();
        this.targetId   = n.getTargetId();
        this.isRead     = n.getIsRead();
        this.createdAt  = n.getCreatedAt();
    }

    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(n);
    }
}
