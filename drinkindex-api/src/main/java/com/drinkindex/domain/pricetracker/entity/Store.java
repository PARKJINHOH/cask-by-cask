package com.drinkindex.domain.pricetracker.entity;

import com.drinkindex.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.drinkindex.domain.pricetracker.entity.enums.StoreType;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
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
public class Store extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StoreType storeType;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DutyFreeChannel dutyfreeChannel;

    @Column(length = 100)
    private String region;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isApproved = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    private User approvedBy;

    @Column
    private LocalDateTime approvedAt;

    @Column
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
