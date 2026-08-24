package com.caskbycask.domain.community.service;

import com.caskbycask.domain.community.dto.NotificationResponse;
import com.caskbycask.domain.community.dto.UnreadCountResponse;
import com.caskbycask.domain.community.entity.Notification;
import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.repository.NotificationRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // ─── 발송 ──────────────────────────────────────────────
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

    /**
     * 동기 발송. 저장 성공 여부를 호출 측이 알아야 할 때 쓴다.
     *
     * <p>목표가 알림은 저장 성공 후에만 발동 시각을 남겨야 한다. {@link #send}는 {@code @Async}라
     * 저장이 실패해도 호출 측이 알 수 없어, 쿨다운만 걸리고 알림은 사라지는 경로가 생긴다.
     * 별도 트랜잭션인 것은 동일하므로 여기서 실패해도 본문 처리(가격 승인)는 롤백되지 않는다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendNow(User recipient, NotificationType type, String message,
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

    // ─── 조회 ──────────────────────────────────────────────
    // 추후 롱폴링 전환 시 이 메서드를 DeferredResult 방식으로 교체 가능한 구조
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(Long userId, NotificationType type, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<Notification> result = (type != null)
                ? notificationRepository.findByRecipientIdAndTypeOrderByCreatedAtDesc(userId, type, pageRequest)
                : notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageRequest);
        return result.map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(Long userId) {
        return new UnreadCountResponse(notificationRepository.countByRecipientIdAndIsReadFalse(userId));
    }

    // ─── 읽음 처리 ─────────────────────────────────────────
    @Transactional
    public void markRead(Long notificationId, Long userId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));
        if (!n.getRecipient().getId().equals(userId)) {
            throw new CustomException(ErrorCode.NOTIFICATION_ACCESS_DENIED);
        }
        n.markRead();
    }

    @Transactional
    public void markAllRead(Long userId) {
        notificationRepository.markAllReadByRecipientId(userId);
    }
}
