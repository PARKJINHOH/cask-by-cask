package com.caskbycask.domain.spirit.entity;

import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

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
@Comment("주류 등록 요청")
public class SpiritRegisterRequest extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("신청자(users.id)")
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Comment("신청 주류 데이터(JSON)")
    private String spiritData;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("심사 상태 — PENDING/APPROVED/REJECTED")
    private RequestStatus status = RequestStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    @Comment("반려 사유")
    private String rejectReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    @Comment("심사자(users.id)")
    private User reviewedBy;

    @Column
    @Comment("심사 일시")
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
