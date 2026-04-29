package com.drinkindex.domain.spirit.entity;

import com.drinkindex.domain.distillery.entity.Distillery;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
        name = "spirit",
        indexes = {
                @Index(name = "idx_spirit_category", columnList = "category"),
                @Index(name = "idx_spirit_status", columnList = "status"),
                @Index(name = "idx_spirit_distillery_id", columnList = "distillery_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Spirit extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nameKo;

    @Column(nullable = false, length = 200)
    private String nameEn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SpiritCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "distillery_id")
    private Distillery distillery;

    @Column(length = 200)
    private String bottler;

    @Column
    private Integer bottledYear;

    @Column
    private Integer vintageYear;

    @Column(precision = 4, scale = 1)
    private BigDecimal abv;

    @Column
    private Integer volumeMl;

    @Column(length = 100)
    private String country;

    @Column(length = 100)
    private String region;

    @Column(precision = 4, scale = 1)
    private BigDecimal avgScore;

    @Builder.Default
    @Column(nullable = false)
    private Integer reviewCount = 0;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private SpiritStatus status = SpiritStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by_id")
    private User registeredBy;

    public void updateAvgScore(BigDecimal avgScore, int reviewCount) {
        this.avgScore = avgScore;
        this.reviewCount = reviewCount;
    }

    public void approve() {
        this.status = SpiritStatus.ACTIVE;
    }

    public void hide() {
        this.status = SpiritStatus.HIDDEN;
    }

    public void activate() {
        this.status = SpiritStatus.ACTIVE;
    }
}
