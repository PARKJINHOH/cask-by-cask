package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.entity.Notification;
import com.caskbycask.domain.community.entity.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);

    Page<Notification> findByRecipientIdAndTypeOrderByCreatedAtDesc(
            Long recipientId, NotificationType type, Pageable pageable);

    long countByRecipientIdAndIsReadFalse(Long recipientId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipient.id = :recipientId AND n.isRead = false")
    void markAllReadByRecipientId(@Param("recipientId") Long recipientId);

    // 90일 경과 알림 일괄 삭제 (배치 전용)
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.createdAt < :cutoff")
    void deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
