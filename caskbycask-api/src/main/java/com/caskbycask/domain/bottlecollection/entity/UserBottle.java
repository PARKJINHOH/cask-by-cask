package com.caskbycask.domain.bottlecollection.entity;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Comment;

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
@Comment("보유 보틀(컬렉션)")
public class UserBottle extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("소유자(users.id)")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id")
    @Comment("주류(spirit.id)")
    private Spirit spirit;

    @Column(name = "spirit_name_text", length = 200)
    @Comment("주류명(직접 입력, 미등록 시)")
    private String spiritNameText;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    @Comment("카테고리 — WHISKY/WINE/COGNAC/OTHER")
    private SpiritCategory category;

    @Column(name = "purchase_date")
    @Comment("구매 일자")
    private LocalDate purchaseDate;

    @Column(name = "batch", length = 100)
    @Comment("배치")
    private String batch;

    @Column(name = "bottling_year", length = 100)
    @Comment("병입 연도")
    private String bottlingYear;

    @Column(name = "price")
    @Comment("구매 가격(원)")
    private Integer price;

    @Column(name = "store", length = 200)
    @Comment("구매처")
    private String store;

    @Column(name = "volume_ml")
    @Comment("보틀 용량(ml)")
    private Integer volumeMl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Comment("개봉 상태 — UNOPENED/OPENED")
    private BottleStatus status;

    @Builder.Default
    @Column(name = "is_public", nullable = false)
    @Comment("공개 여부")
    private Boolean isPublic = false;

    @Column(name = "memo", columnDefinition = "TEXT")
    @Comment("메모")
    private String memo;

    @OneToMany(mappedBy = "userBottle", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    @BatchSize(size = 50)
    private List<UserBottleImage> images = new ArrayList<>();

    public void update(Spirit spirit, String spiritNameText, SpiritCategory category,
                       LocalDate purchaseDate, String batch, String bottlingYear,
                       Integer price, String store, Integer volumeMl, BottleStatus status,
                       Boolean isPublic, String memo) {
        this.spirit = spirit;
        this.spiritNameText = spiritNameText;
        this.category = category;
        this.purchaseDate = purchaseDate;
        this.batch = batch;
        this.bottlingYear = bottlingYear;
        this.price = price;
        this.store = store;
        this.volumeMl = volumeMl;
        this.status = status;
        this.isPublic = isPublic;
        this.memo = memo;
    }

    public void toggleStatus() {
        this.status = (this.status == BottleStatus.OPENED) ? BottleStatus.UNOPENED : BottleStatus.OPENED;
    }

    public void togglePublic() {
        this.isPublic = !Boolean.TRUE.equals(this.isPublic);
    }

    public void addImage(UserBottleImage image) {
        images.add(image);
    }

    public boolean isOwnedBy(Long userId) {
        return this.user.getId().equals(userId);
    }
}
