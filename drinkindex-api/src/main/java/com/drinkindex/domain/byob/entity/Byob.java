package com.drinkindex.domain.byob.entity;

import com.drinkindex.domain.byob.entity.enums.ByobStatus;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "byobs",
    indexes = {
        @Index(name = "idx_byob_status", columnList = "status"),
        @Index(name = "idx_byob_host",   columnList = "host_id")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Byob extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    @Column(nullable = false, length = 100)
    private String title;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 100)
    private String location;

    @Column(nullable = false, length = 200)
    private String address;

    @Column(nullable = false)
    private LocalDateTime eventAt;

    @Column(nullable = false)
    private LocalDateTime recruitStartAt;

    @Column(nullable = false)
    private LocalDateTime recruitEndAt;

    @Column(nullable = false)
    private int maxParticipants;

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "byob_host_bottles", joinColumns = @JoinColumn(name = "byob_id"))
    @Column(name = "bottle_name", nullable = false, length = 100)
    private List<String> hostBottles = new ArrayList<>();

    @Builder.Default
    @Column(nullable = false)
    private int approvedCount = 0;

    @Builder.Default
    @Column(nullable = false)
    private int pendingCount = 0;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ByobStatus status = ByobStatus.OPEN;

    @Column
    private Long linkedFreePostId;

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
}
