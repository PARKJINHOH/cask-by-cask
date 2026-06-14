package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

// BaseTimeEntity 대신 createdAt만 사용 (updatedAt 불필요, 90일 삭제 배치 기준)
@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(name = "idx_notification_recipient_read_created",
                        columnList = "recipient_id, is_read, created_at")
        }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("알림")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    @Comment("수신자(users.id)")
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("알림 유형 — COMMENT/REPLY/LIKE/MENTION/MESSAGE/BYOB_*/PRICE_ALERT/REQUEST_*/SYSTEM")
    private NotificationType type;

    @Column(nullable = false, length = 200)
    @Comment("알림 메시지")
    private String message;

    @Column(length = 50)
    @Comment("대상 유형")
    private String targetType;

    @Comment("대상 식별자")
    private Long targetId;

    @Builder.Default
    @Column(nullable = false)
    @Comment("읽음 여부")
    private Boolean isRead = false;

    @CreatedDate
    @Column(updatable = false, nullable = false)
    @Comment("생성 일시")
    private LocalDateTime createdAt;

    public void markRead() { this.isRead = true; }
}
