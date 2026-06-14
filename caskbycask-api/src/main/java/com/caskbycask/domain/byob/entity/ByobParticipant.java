package com.caskbycask.domain.byob.entity;

import com.caskbycask.domain.byob.entity.enums.ParticipantStatus;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "byob_participants",
    indexes = {
        @Index(name = "idx_bp_byob",   columnList = "byob_id"),
        @Index(name = "idx_bp_user",   columnList = "user_id"),
        @Index(name = "idx_bp_status", columnList = "status")
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("BYOB 모임 참가자")
public class ByobParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "byob_id", nullable = false)
    @Comment("BYOB 모임(byobs.id)")
    private Byob byob;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("참가자(users.id)")
    private User user;

    @Column(nullable = false, length = 500)
    @Comment("가져올 보틀명")
    private String bottleName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id")
    @Comment("가져올 주류(spirit.id)")
    private Spirit spirit;

    @Column(length = 200)
    @Comment("참가자 메모")
    private String memo;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("참가 상태 — PENDING/APPROVED/REJECTED/REMOVED")
    private ParticipantStatus status = ParticipantStatus.PENDING;

    @Column(length = 300)
    @Comment("제외 사유")
    private String removedReason;

    @CreatedDate
    @Column(updatable = false, nullable = false)
    @Comment("신청 일시")
    private LocalDateTime appliedAt;

    public void approve() {
        this.status = ParticipantStatus.APPROVED;
    }

    public void reject() {
        this.status = ParticipantStatus.REJECTED;
    }

    public void remove(String reason) {
        this.status = ParticipantStatus.REMOVED;
        this.removedReason = reason;
    }
}
