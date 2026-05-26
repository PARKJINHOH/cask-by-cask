package com.drinkindex.domain.bottlecollection.entity;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "user_bottle",
    indexes = {
        @Index(name = "idx_user_bottle_user_id", columnList = "user_id"),
        @Index(name = "idx_user_bottle_user_category", columnList = "user_id, category"),
        @Index(name = "idx_user_bottle_user_public", columnList = "user_id, is_public")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class UserBottle extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;

    @Column(name = "spirit_name_text", length = 200)
    private String spiritNameText;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private SpiritCategory category;

    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    @Column(name = "batch", length = 100)
    private String batch;

    @Column(name = "bottling_year", length = 100)
    private String bottlingYear;

    @Column(name = "price", nullable = false)
    private Integer price;

    @Column(name = "store", nullable = false, length = 200)
    private String store;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private BottleStatus status;

    @Column(name = "is_public", nullable = false)
    private boolean isPublic;

    @Column(name = "memo", columnDefinition = "TEXT")
    private String memo;

    @OneToMany(mappedBy = "userBottle", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<UserBottleImage> images = new ArrayList<>();

    public void update(Spirit spirit, String spiritNameText, SpiritCategory category,
                       LocalDate purchaseDate, String batch, String bottlingYear,
                       Integer price, String store, BottleStatus status,
                       boolean isPublic, String memo) {
        this.spirit = spirit;
        this.spiritNameText = spiritNameText;
        this.category = category;
        this.purchaseDate = purchaseDate;
        this.batch = batch;
        this.bottlingYear = bottlingYear;
        this.price = price;
        this.store = store;
        this.status = status;
        this.isPublic = isPublic;
        this.memo = memo;
    }

    public void toggleStatus() {
        this.status = (this.status == BottleStatus.OPENED) ? BottleStatus.UNOPENED : BottleStatus.OPENED;
    }

    public void togglePublic() {
        this.isPublic = !this.isPublic;
    }

    public boolean isOwnedBy(Long userId) {
        return this.user.getId().equals(userId);
    }
}
