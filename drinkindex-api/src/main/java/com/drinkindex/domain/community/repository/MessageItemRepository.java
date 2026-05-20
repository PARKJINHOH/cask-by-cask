package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.MessageItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MessageItemRepository extends JpaRepository<MessageItem, Long> {

    List<MessageItem> findByMessageIdOrderByCreatedAtAsc(Long messageId);

    Optional<MessageItem> findFirstByMessageIdOrderByCreatedAtDesc(Long messageId);

    @Query("SELECT COUNT(mi) > 0 FROM MessageItem mi WHERE mi.message.id = :messageId AND mi.isRead = false")
    boolean existsUnreadByMessageId(@Param("messageId") Long messageId);

    // 나에게 온 미읽음 메시지 여부 (내가 보낸 것 제외)
    @Query("SELECT COUNT(mi) > 0 FROM MessageItem mi WHERE mi.message.id = :messageId AND mi.isRead = false AND mi.sender.id != :userId")
    boolean existsUnreadReceivedBy(@Param("messageId") Long messageId, @Param("userId") Long userId);
}
