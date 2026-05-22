package com.drinkindex.domain.byob.entity;

import com.drinkindex.domain.byob.entity.enums.ParticipantStatus;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
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
public class ByobParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "byob_id", nullable = false)
    private Byob byob;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 500)
    private String bottleName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;

    @Column(length = 200)
    private String memo;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ParticipantStatus status = ParticipantStatus.PENDING;

    @Column(length = 300)
    private String removedReason;

    @CreatedDate
    @Column(updatable = false, nullable = false)
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
