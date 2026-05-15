package com.drinkindex.domain.community.service;

import com.drinkindex.domain.community.entity.Notification;
import com.drinkindex.domain.community.entity.enums.NotificationType;
import com.drinkindex.domain.community.repository.NotificationRepository;
import com.drinkindex.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // 별도 트랜잭션: 알림 저장 실패가 본문 처리를 롤백하지 않도록 분리
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void send(User recipient, NotificationType type, String message,
                     String targetType, Long targetId) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .message(message)
                .targetType(targetType)
                .targetId(targetId)
                .build();
        notificationRepository.save(notification);
    }
}
