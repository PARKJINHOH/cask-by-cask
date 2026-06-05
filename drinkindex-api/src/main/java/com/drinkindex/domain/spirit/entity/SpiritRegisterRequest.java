package com.drinkindex.domain.spirit.entity;

import com.drinkindex.domain.spirit.entity.enums.RequestStatus;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "spirit_register_request",
        indexes = {
                @Index(name = "idx_spirit_req_user_id", columnList = "user_id"),
                @Index(name = "idx_spirit_req_status", columnList = "status")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SpiritRegisterRequest extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String spiritData;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String rejectReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    @Column
    private LocalDateTime reviewedAt;

    public void approve(User reviewer) {
        this.status = RequestStatus.APPROVED;
        this.reviewedBy = reviewer;
        this.reviewedAt = LocalDateTime.now();
    }

    public void reject(User reviewer, String reason) {
        this.status = RequestStatus.REJECTED;
        this.reviewedBy = reviewer;
        this.reviewedAt = LocalDateTime.now();
        this.rejectReason = reason;
    }

    public void updateSpiritData(String spiritData) {
        this.spiritData = spiritData;
    }

    /** 신청자가 수정 후 재제출 — 반려 건은 다시 검토 대기로 전환 */
    public void resubmit() {
        this.status = RequestStatus.PENDING;
        this.rejectReason = null;
        this.reviewedBy = null;
        this.reviewedAt = null;
    }
}
