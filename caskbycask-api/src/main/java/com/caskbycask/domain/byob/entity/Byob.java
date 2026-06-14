package com.caskbycask.domain.byob.entity;

import com.caskbycask.domain.byob.entity.enums.ByobStatus;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "byobs",
    indexes = {
        @Index(name = "idx_byob_status", columnList = "status"),
        @Index(name = "idx_byob_host",   columnList = "host_id"),
        @Index(name = "idx_byob_pinned", columnList = "is_pinned")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("BYOB(Bring Your Own Bottle) 모임")
public class Byob extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    @Comment("호스트(users.id)")
    private User host;

    @Column(nullable = false, length = 100)
    @Comment("모임 제목")
    private String title;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    @Comment("모임 소개")
    private String content;

    @Column(nullable = false, length = 100)
    @Comment("장소명")
    private String location;

    @Column(nullable = false, length = 200)
    @Comment("상세 주소")
    private String address;

    @Column(nullable = false)
    @Comment("모임 일시")
    private LocalDateTime eventAt;

    @Column(nullable = false)
    @Comment("모집 시작 일시")
    private LocalDateTime recruitStartAt;

    @Column(nullable = false)
    @Comment("모집 종료 일시")
    private LocalDateTime recruitEndAt;

    @Column(nullable = false)
    @Comment("최대 참가 인원")
    private int maxParticipants;

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "byob_host_bottles", joinColumns = @JoinColumn(name = "byob_id"))
    @Column(name = "bottle_name", nullable = false, length = 100)
    @Comment("호스트 준비 보틀명")
    private List<String> hostBottles = new ArrayList<>();

    @Builder.Default
    @Column(nullable = false)
    @Comment("승인된 참가자 수")
    private int approvedCount = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("대기 중 참가자 수")
    private int pendingCount = 0;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("모임 상태 — OPEN/CLOSED/CANCELLED")
    private ByobStatus status = ByobStatus.OPEN;

    @Column
    @Comment("연결된 자유게시글(posts.id)")
    private Long linkedFreePostId;

    // BYOB 게시판 공지(고정글) 여부. 관리자/파트너만 설정 가능 (서비스 레이어 검증).
    @Builder.Default
    @Column(nullable = false)
    @Comment("BYOB 공지(상단 고정) 여부")
    private Boolean isPinned = false;

    public void update(String title, String content, String location, String address,
                       LocalDateTime eventAt, LocalDateTime recruitStartAt,
                       LocalDateTime recruitEndAt, int maxParticipants,
                       List<String> hostBottles) {
        this.title = title;
        this.content = content;
        this.location = location;
        this.address = address;
        this.eventAt = eventAt;
        this.recruitStartAt = recruitStartAt;
        this.recruitEndAt = recruitEndAt;
        this.maxParticipants = maxParticipants;
        this.hostBottles.clear();
        if (hostBottles != null) this.hostBottles.addAll(hostBottles);
    }

    public void changeStatus(ByobStatus status) {
        this.status = status;
    }

    public void incrementApprovedCount() {
        this.approvedCount++;
    }

    public void decrementApprovedCount() {
        if (this.approvedCount > 0) this.approvedCount--;
    }

    public void incrementPendingCount() {
        this.pendingCount++;
    }

    public void decrementPendingCount() {
        if (this.pendingCount > 0) this.pendingCount--;
    }

    public void setLinkedFreePostId(Long linkedFreePostId) {
        this.linkedFreePostId = linkedFreePostId;
    }

    public void changePinned(boolean pinned) {
        this.isPinned = pinned;
    }
}
