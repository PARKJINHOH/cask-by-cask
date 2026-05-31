package com.drinkindex.domain.spirit.entity;

import com.drinkindex.domain.distillery.entity.Distillery;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import static jakarta.persistence.CascadeType.ALL;
import static jakarta.persistence.FetchType.LAZY;

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

    @OneToOne(mappedBy = "spirit", cascade = ALL, orphanRemoval = true, fetch = LAZY)
    private SpiritCommonDetail commonDetail;

    @OneToOne(mappedBy = "spirit", cascade = ALL, orphanRemoval = true, fetch = LAZY)
    private SpiritWhiskyDetail whiskyDetail;

    @OneToOne(mappedBy = "spirit", cascade = ALL, orphanRemoval = true, fetch = LAZY)
    private SpiritWineDetail wineDetail;

    @OneToOne(mappedBy = "spirit", cascade = ALL, orphanRemoval = true, fetch = LAZY)
    private SpiritCognacDetail cognacDetail;

    @OneToOne(mappedBy = "spirit", cascade = ALL, orphanRemoval = true, fetch = LAZY)
    private SpiritOtherDetail otherDetail;

    public void update(String nameKo, String nameEn, SpiritCategory category,
                       Distillery distillery, String bottler, Integer bottledYear,
                       Integer vintageYear, BigDecimal abv, Integer volumeMl,
                       String country, String region) {
        this.nameKo = nameKo;
        this.nameEn = nameEn;
        this.category = category;
        this.distillery = distillery;
        this.bottler = bottler;
        this.bottledYear = bottledYear;
        this.vintageYear = vintageYear;
        this.abv = abv;
        this.volumeMl = volumeMl;
        this.country = country;
        this.region = region;
    }

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

    /** 카테고리 변경 시 기존 서브 테이블 row 제거 (orphanRemoval이 처리) */
    public void clearCategoryDetail() {
        this.whiskyDetail = null;
        this.wineDetail = null;
        this.cognacDetail = null;
        this.otherDetail = null;
    }
}
