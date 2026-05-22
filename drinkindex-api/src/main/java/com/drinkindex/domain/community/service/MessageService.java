package com.drinkindex.domain.community.service;

import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.entity.Message;
import com.drinkindex.domain.community.entity.MessageItem;
import com.drinkindex.domain.community.entity.enums.NotificationType;
import com.drinkindex.domain.community.repository.MessageItemRepository;
import com.drinkindex.domain.community.repository.MessageRepository;
import com.drinkindex.domain.community.repository.UserBlockRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.util.BadWordFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final MessageItemRepository messageItemRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final NotificationService notificationService;
    private final BadWordFilter badWordFilter;

    public enum MessageBox { INBOX, SENT, ALL }

    // ═══════════════════════════════════════════
    // 목록
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<MessageSummaryResponse> getMessages(Long userId, MessageBox box, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<Message> messages;

        if (box == MessageBox.INBOX) {
            messages = messageRepository
                    .findByReceiverIdAndIsDeletedByReceiverFalseOrderByCreatedAtDesc(userId, pageRequest);
        } else if (box == MessageBox.SENT) {
            messages = messageRepository
                    .findBySenderIdAndIsDeletedBySenderFalseOrderByCreatedAtDesc(userId, pageRequest);
        } else {
            messages = messageRepository.findAllByParticipant(userId, pageRequest);
        }

        return messages.map(m -> buildSummary(m, userId, box));
    }

    // ═══════════════════════════════════════════
    // 상세 조회
    // ═══════════════════════════════════════════

    @Transactional
    public MessageDetailResponse getThread(Long messageId, Long userId) {
        Message message = findMessage(messageId);
        validateParticipant(message, userId);

        List<MessageItem> items = messageItemRepository.findByMessageIdOrderByCreatedAtAsc(messageId);

        // 상대방이 보낸 항목만 읽음 처리 (내가 보낸 것은 제외)
        // → receiver뿐 아니라 sender도 상대방 답장을 읽을 수 있음
        items.stream()
             .filter(item -> !Boolean.TRUE.equals(item.getIsRead()))
             .filter(item -> !item.getSender().getId().equals(userId))
             .forEach(MessageItem::markRead);

        return new MessageDetailResponse(message, items);
    }

    // ═══════════════════════════════════════════
    // 발송
    // ═══════════════════════════════════════════

    @Transactional
    public MessageDetailResponse sendMessage(SendMessageRequest request, Long senderId) {
        User sender = findUser(senderId);
        User receiver = userRepository.findByNicknameAndNotDeleted(request.getReceiverNickname())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 차단 확인 (발신자→수신자 차단 or 수신자→발신자 차단)
        if (userBlockRepository.existsByBlockerIdAndBlockedId(senderId, receiver.getId())
                || userBlockRepository.existsByBlockerIdAndBlockedId(receiver.getId(), senderId)) {
            throw new CustomException(ErrorCode.MESSAGE_BLOCKED);
        }

        badWordFilter.validate(request.getContent());

        // 기존 스레드 재사용 (sender=나, receiver=상대) 또는 신규 생성
        List<Message> existing = messageRepository.findThreadsBetween(senderId, receiver.getId(),
                PageRequest.of(0, 1));

        Message message;
        if (!existing.isEmpty()) {
            message = existing.get(0);
            // 상대방이 삭제했어도 새 메시지 수신 시 복구
            if (message.getReceiver().getId().equals(receiver.getId())
                    && Boolean.TRUE.equals(message.getIsDeletedByReceiver())) {
                message.deleteByReceiver(); // toggle back — entity에 restore 추가
            }
        } else {
            message = Message.builder().sender(sender).receiver(receiver).build();
            message = messageRepository.save(message);
        }

        MessageItem item = MessageItem.builder()
                .message(message).sender(sender).content(request.getContent()).build();
        messageItemRepository.save(item);

        // 알림
        notificationService.send(receiver, NotificationType.MESSAGE,
                sender.getNickname() + "님으로부터 쪽지가 도착했습니다.", "MESSAGE", message.getId());

        return new MessageDetailResponse(message,
                messageItemRepository.findByMessageIdOrderByCreatedAtAsc(message.getId()));
    }

    // ═══════════════════════════════════════════
    // 답장
    // ═══════════════════════════════════════════

    @Transactional
    public MessageDetailResponse reply(Long messageId, ReplyMessageRequest request, Long senderId) {
        Message message = findMessage(messageId);
        validateParticipant(message, senderId);

        badWordFilter.validate(request.getContent());

        User sender = findUser(senderId);
        MessageItem item = MessageItem.builder()
                .message(message).sender(sender).content(request.getContent()).build();
        messageItemRepository.save(item);

        // 상대방에게 알림
        User partner = message.getSender().getId().equals(senderId)
                ? message.getReceiver() : message.getSender();
        notificationService.send(partner, NotificationType.MESSAGE,
                sender.getNickname() + "님으로부터 쪽지가 도착했습니다.", "MESSAGE", messageId);

        return new MessageDetailResponse(message,
                messageItemRepository.findByMessageIdOrderByCreatedAtAsc(messageId));
    }

    // ═══════════════════════════════════════════
    // 삭제
    // ═══════════════════════════════════════════

    @Transactional
    public void deleteMessage(Long messageId, Long userId) {
        Message message = findMessage(messageId);
        validateParticipant(message, userId);

        if (message.getSender().getId().equals(userId)) {
            message.deleteBySender();
        } else {
            message.deleteByReceiver();
        }

        // 양쪽 모두 삭제하면 Hard Delete
        if (Boolean.TRUE.equals(message.getIsDeletedBySender())
                && Boolean.TRUE.equals(message.getIsDeletedByReceiver())) {
            messageRepository.delete(message); // cascade로 items 함께 삭제
        }
    }

    // ═══════════════════════════════════════════
    // 시스템 발송 (차단/금칙어 검사 없음)
    // ═══════════════════════════════════════════

    @Transactional
    public void sendSystemMessage(User sender, User receiver, String content) {
        List<Message> existing = messageRepository.findThreadsBetween(sender.getId(), receiver.getId(),
                PageRequest.of(0, 1));

        Message message;
        if (!existing.isEmpty()) {
            message = existing.get(0);
        } else {
            message = messageRepository.save(Message.builder().sender(sender).receiver(receiver).build());
        }

        messageItemRepository.save(MessageItem.builder()
                .message(message).sender(sender).content(content).build());

        notificationService.send(receiver, NotificationType.MESSAGE,
                sender.getNickname() + "님으로부터 쪽지가 도착했습니다.", "MESSAGE", message.getId());
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    private MessageSummaryResponse buildSummary(Message message, Long userId, MessageBox box) {
        String partnerNickname = message.getSender().getId().equals(userId)
                ? message.getReceiver().getNickname()
                : message.getSender().getNickname();

        String lastMessage = messageItemRepository
                .findFirstByMessageIdOrderByCreatedAtDesc(message.getId())
                .map(MessageItem::getContent)
                .orElse("");

        boolean hasUnread = messageItemRepository.existsUnreadReceivedBy(message.getId(), userId);

        return MessageSummaryResponse.builder()
                .id(message.getId())
                .partnerNickname(partnerNickname)
                .lastMessage(lastMessage.length() > 50 ? lastMessage.substring(0, 50) + "..." : lastMessage)
                .hasUnread(hasUnread)
                .createdAt(message.getCreatedAt())
                .build();
    }

    private Message findMessage(Long id) {
        return messageRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.MESSAGE_NOT_FOUND));
    }

    private void validateParticipant(Message message, Long userId) {
        boolean isSender   = message.getSender().getId().equals(userId);
        boolean isReceiver = message.getReceiver().getId().equals(userId);
        if (!isSender && !isReceiver) {
            throw new CustomException(ErrorCode.MESSAGE_ACCESS_DENIED);
        }
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
