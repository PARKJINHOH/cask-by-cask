package com.caskbycask.domain.venue.entity;

import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

/**
 * 장소 등록 요청.
 *
 * <p>생산자 등록 요청과 같은 설계다 — 제출 폼 전체를 JSON 한 덩어리({@code venueData})로 담는다.
 * 신청 표에 필드를 하나씩 두면 폼이 바뀔 때마다 마이그레이션이 따라오는데, 승인되고 나면
 * 어차피 진짜 표({@code venue})로 옮겨 가므로 신청 단계에 정규화된 스키마가 필요하지 않다.
 */
@Entity
@Table(
        name = "venue_register_request",
        indexes = {
                @Index(name = "idx_venue_request_user", columnList = "user_id, id"),
                @Index(name = "idx_venue_request_status", columnList = "status, id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("장소 등록 요청")
public class VenueRegisterRequest extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("신청자(users.id)")
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Comment("신청 장소 데이터(JSON)")
    private String venueData;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("처리 상태 — PENDING/APPROVED/REJECTED")
    private RequestStatus status = RequestStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    @Comment("거절 사유")
    private String rejectReason;

    @Column(name = "created_venue_id")
    @Comment("승인으로 만들어진 장소(venue.id)")
    private Long createdVenueId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    @Comment("처리한 관리자(users.id)")
    private User reviewedBy;

    @Column
    @Comment("처리 일시")
    private LocalDateTime reviewedAt;

    public void updateVenueData(String venueData) {
        this.venueData = venueData;
    }

    public void approve(User reviewer, Long createdVenueId) {
        this.status = RequestStatus.APPROVED;
        this.reviewedBy = reviewer;
        this.reviewedAt = LocalDateTime.now();
        this.createdVenueId = createdVenueId;
    }

    public void reject(User reviewer, String reason) {
        this.status = RequestStatus.REJECTED;
        this.reviewedBy = reviewer;
        this.reviewedAt = LocalDateTime.now();
        this.rejectReason = reason;
    }

    /** 처리된 요청은 더 손대지 않는다 — 같은 요청이 두 번 승인되어 장소가 중복 생성되는 것을 막는다. */
    public boolean isPending() {
        return status == RequestStatus.PENDING;
    }
}
