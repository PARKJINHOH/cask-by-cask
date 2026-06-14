package com.caskbycask.domain.pricetracker.entity;

import com.caskbycask.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "stores", indexes = {
        @Index(name = "idx_store_display_name", columnList = "display_name"),
        @Index(name = "idx_store_is_approved", columnList = "is_approved")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("판매처(매장/면세)")
public class Store extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(name = "display_name", nullable = false, length = 255)
    @Comment("표시명")
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("판매처 유형 — DOMESTIC(국내)/DUTYFREE(면세)")
    private StoreType storeType;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Comment("면세 채널 — AIRPORT/CITY/INFLIGHT/ONLINE")
    private DutyFreeChannel dutyfreeChannel;

    @Column(length = 100)
    @Comment("지역")
    private String region;

    @Builder.Default
    @Column(nullable = false)
    @Comment("승인 여부")
    private Boolean isApproved = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    @Comment("등록자(users.id)")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    @Comment("승인자(users.id)")
    private User approvedBy;

    @Column
    @Comment("승인 일시")
    private LocalDateTime approvedAt;

    @Column
    @Comment("삭제 일시(소프트삭제)")
    private LocalDateTime deletedAt;

    @Builder.Default
    @OneToMany(mappedBy = "store", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StoreAlias> aliases = new ArrayList<>();

    public void approve(User admin) {
        this.isApproved = true;
        this.approvedBy = admin;
        this.approvedAt = LocalDateTime.now();
    }

    public void update(String displayName, StoreType storeType, DutyFreeChannel dutyfreeChannel, String region) {
        this.displayName = displayName;
        this.storeType = storeType;
        this.dutyfreeChannel = dutyfreeChannel;
        this.region = region;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }
}
